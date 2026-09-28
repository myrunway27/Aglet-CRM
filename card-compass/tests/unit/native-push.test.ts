import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ApnsSender, FcmSender, signJwt, type Http2Post } from "@/lib/native-push/senders";

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
const rsaPem = rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ecPem = ec.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());
const payload = { title: "Pikachu below USD 0.40", body: "Now USD 0.38", url: "/alerts" };
const NOW = Date.parse("2026-09-28T12:00:00Z");

describe("JWT signing", () => {
  it("RS256 and ES256 signatures verify with the public keys", () => {
    const r = signJwt({ alg: "RS256" }, { a: 1 }, rsaPem, "RS256").split(".");
    expect(verify("sha256", Buffer.from(`${r[0]}.${r[1]}`), rsa.publicKey, Buffer.from(r[2], "base64url"))).toBe(true);
    const e = signJwt({ alg: "ES256" }, { a: 1 }, ecPem, "ES256").split(".");
    expect(Buffer.from(e[2], "base64url")).toHaveLength(64); // raw r||s as JOSE requires
    expect(verify("sha256", Buffer.from(`${e[0]}.${e[1]}`), { key: ec.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(e[2], "base64url"))).toBe(true);
  });
});

describe("FcmSender", () => {
  it("gets a service-account token once, then sends v1 messages", async () => {
    const f = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("oauth2")) {
        const assertion = new URLSearchParams(init.body as string).get("assertion")!;
        const claims = decode(assertion.split(".")[1]);
        expect(claims).toMatchObject({ iss: "svc@proj.iam.gserviceaccount.com", scope: "https://www.googleapis.com/auth/firebase.messaging" });
        return Response.json({ access_token: "at", expires_in: 3600 });
      }
      return Response.json({ name: "projects/p/messages/1" });
    });
    const s = new FcmSender({ projectId: "proj", clientEmail: "svc@proj.iam.gserviceaccount.com", privateKey: rsaPem }, f as unknown as typeof fetch, () => NOW);
    expect(await s.send("device-token-1", payload)).toBe("sent");
    expect(await s.send("device-token-2", payload)).toBe("sent");
    const calls = f.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.filter(([u]) => u.includes("oauth2"))).toHaveLength(1);
    const [url, init] = calls[1];
    expect(url).toBe("https://fcm.googleapis.com/v1/projects/proj/messages:send");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer at");
    expect(JSON.parse(init.body as string).message).toEqual({ token: "device-token-1", notification: { title: payload.title, body: payload.body }, data: { url: "/alerts" } });
  });

  it("reports unregistered tokens so they can be deleted", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("oauth2") ? Response.json({ access_token: "at", expires_in: 3600 }) : new Response('{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}', { status: 404 }),
    );
    const s = new FcmSender({ projectId: "p", clientEmail: "e", privateKey: rsaPem }, f as unknown as typeof fetch, () => NOW);
    expect(await s.send("t", payload)).toBe("invalid-token");
  });
});

describe("ApnsSender", () => {
  const cfg = { teamId: "TEAM123", keyId: "KEY123", privateKey: ecPem, bundleId: "com.example.cardcompass", production: false };

  it("posts an alert to the sandbox with a reusable ES256 provider token", async () => {
    const post = vi.fn<Http2Post>(async () => ({ status: 200, body: "" }));
    const s = new ApnsSender(cfg, post, () => NOW);
    const token = "a".repeat(64);
    expect(await s.send(token, payload)).toBe("sent");
    expect(await s.send(token, payload)).toBe("sent");
    const [origin, path, headers, body] = post.mock.calls[0];
    expect(origin).toBe("https://api.sandbox.push.apple.com");
    expect(path).toBe(`/3/device/${token}`);
    expect(headers["apns-topic"]).toBe("com.example.cardcompass");
    const jwt = headers.authorization.replace("bearer ", "").split(".");
    expect(decode(jwt[0])).toEqual({ alg: "ES256", kid: "KEY123" });
    expect(decode(jwt[1])).toEqual({ iss: "TEAM123", iat: Math.floor(NOW / 1000) });
    expect(post.mock.calls[1][2].authorization).toBe(headers.authorization); // reused
    expect(JSON.parse(body)).toEqual({ aps: { alert: { title: payload.title, body: payload.body }, sound: "default" }, url: "/alerts" });
  });

  it("maps 410 / BadDeviceToken to invalid-token and rejects malformed tokens without a request", async () => {
    const post = vi.fn<Http2Post>().mockResolvedValueOnce({ status: 410, body: '{"reason":"Unregistered"}' }).mockResolvedValueOnce({ status: 400, body: '{"reason":"BadDeviceToken"}' });
    const s = new ApnsSender(cfg, post, () => NOW);
    expect(await s.send("b".repeat(64), payload)).toBe("invalid-token");
    expect(await s.send("c".repeat(64), payload)).toBe("invalid-token");
    expect(await s.send("not-hex!", payload)).toBe("invalid-token");
    expect(post).toHaveBeenCalledTimes(2);
  });
});
