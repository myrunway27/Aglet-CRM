import { connect } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";
import type { FetchLike } from "../http";

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path to open, e.g. "/alerts". */
  url: string;
}

export type SendResult = "sent" | "invalid-token" | "failed";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Compact JWS. RS256 for Google service accounts, ES256 (raw r||s) for APNs. */
export function signJwt(header: object, claims: object, pem: string, alg: "RS256" | "ES256"): string {
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = createPrivateKey(pem);
  const sig =
    alg === "RS256" ? sign("sha256", Buffer.from(input), key) : sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64url(sig)}`;
}

// ---------------------------------------------------------------- FCM (Android)

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** Firebase Cloud Messaging HTTP v1 with a service-account OAuth token (cached until near expiry). */
export class FcmSender {
  private token: { value: string; exp: number } | null = null;
  constructor(
    private readonly cfg: FcmConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  private async accessToken(): Promise<string> {
    const t = Math.floor(this.now() / 1000);
    if (this.token && this.token.exp - 60 > t) return this.token.value;
    const assertion = signJwt(
      { alg: "RS256", typ: "JWT" },
      {
        iss: this.cfg.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: t,
        exp: t + 3600,
      },
      this.cfg.privateKey,
      "RS256",
    );
    const res = await this.fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`FCM auth failed (${res.status})`);
    const j = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: j.access_token, exp: t + j.expires_in };
    return j.access_token;
  }

  async send(deviceToken: string, p: PushPayload): Promise<SendResult> {
    try {
      const res = await this.fetchImpl(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(this.cfg.projectId)}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await this.accessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: deviceToken, notification: { title: p.title, body: p.body }, data: { url: p.url } } }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return "sent";
      const text = await res.text();
      if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) return "invalid-token";
      return "failed";
    } catch {
      return "failed";
    }
  }
}

// ---------------------------------------------------------------- APNs (iOS)

export interface ApnsConfig {
  teamId: string;
  keyId: string;
  /** .p8 key contents (PEM). */
  privateKey: string;
  bundleId: string;
  production: boolean;
}

/** Minimal HTTP/2 POST, injectable for tests. */
export type Http2Post = (
  origin: string,
  path: string,
  headers: Record<string, string>,
  body: string,
) => Promise<{ status: number; body: string }>;

export const http2Post: Http2Post = (origin, path, headers, body) =>
  new Promise((resolve, reject) => {
    const client = connect(origin);
    client.on("error", reject);
    const req = client.request({ ":method": "POST", ":path": path, ...headers });
    let status = 0;
    let data = "";
    req.setTimeout(8000, () => req.close());
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      client.close();
      resolve({ status, body: data });
    });
    req.on("error", (e) => {
      client.close();
      reject(e);
    });
    req.end(body);
  });

/** Apple Push Notification service with token (.p8) auth. Provider JWTs are reused for up to 50 minutes. */
export class ApnsSender {
  private jwt: { value: string; iat: number } | null = null;
  constructor(
    private readonly cfg: ApnsConfig,
    private readonly post: Http2Post = http2Post,
    private readonly now: () => number = Date.now,
  ) {}

  private providerToken(): string {
    const t = Math.floor(this.now() / 1000);
    if (this.jwt && t - this.jwt.iat < 50 * 60) return this.jwt.value;
    const value = signJwt({ alg: "ES256", kid: this.cfg.keyId }, { iss: this.cfg.teamId, iat: t }, this.cfg.privateKey, "ES256");
    this.jwt = { value, iat: t };
    return value;
  }

  async send(deviceToken: string, p: PushPayload): Promise<SendResult> {
    if (!/^[0-9a-fA-F]{32,200}$/.test(deviceToken)) return "invalid-token";
    try {
      const origin = this.cfg.production ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
      const res = await this.post(
        origin,
        `/3/device/${deviceToken}`,
        {
          authorization: `bearer ${this.providerToken()}`,
          "apns-topic": this.cfg.bundleId,
          "apns-push-type": "alert",
          "content-type": "application/json",
        },
        JSON.stringify({ aps: { alert: { title: p.title, body: p.body }, sound: "default" }, url: p.url }),
      );
      if (res.status === 200) return "sent";
      if (res.status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(res.body)) return "invalid-token";
      return "failed";
    } catch {
      return "failed";
    }
  }
}
