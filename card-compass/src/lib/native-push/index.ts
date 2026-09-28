import "server-only";
import { db } from "../db";
import { env } from "../env";
import { log } from "../log";
import { ApnsSender, FcmSender, type PushPayload } from "./senders";

let fcm: FcmSender | null | undefined;
let apns: ApnsSender | null | undefined;
const pem = (s: string) => s.replace(/\\n/g, "\n"); // keys are usually stored with escaped newlines

function senders() {
  const e = env();
  if (fcm === undefined)
    fcm =
      e.FCM_PROJECT_ID && e.FCM_CLIENT_EMAIL && e.FCM_PRIVATE_KEY
        ? new FcmSender({ projectId: e.FCM_PROJECT_ID, clientEmail: e.FCM_CLIENT_EMAIL, privateKey: pem(e.FCM_PRIVATE_KEY) })
        : null;
  if (apns === undefined)
    apns =
      e.APNS_TEAM_ID && e.APNS_KEY_ID && e.APNS_PRIVATE_KEY && e.APNS_BUNDLE_ID
        ? new ApnsSender({ teamId: e.APNS_TEAM_ID, keyId: e.APNS_KEY_ID, privateKey: pem(e.APNS_PRIVATE_KEY), bundleId: e.APNS_BUNDLE_ID, production: e.APNS_PRODUCTION })
        : null;
  return { fcm, apns };
}

export const nativePushEnabled = () => {
  const s = senders();
  return { android: Boolean(s.fcm), ios: Boolean(s.apns) };
};

/** Send to every native device of the user; tokens the platform rejects are deleted. */
export async function nativePushToUser(userId: string, payload: PushPayload): Promise<number> {
  const client = db();
  if (!client) return 0;
  const { fcm, apns } = senders();
  if (!fcm && !apns) return 0;
  const tokens = await client.nativePushToken.findMany({ where: { userId } });
  let sent = 0;
  for (const t of tokens) {
    const sender = t.platform === "ios" ? apns : fcm;
    if (!sender) continue;
    const r = await sender.send(t.token, payload);
    if (r === "sent") sent++;
    else if (r === "invalid-token") await client.nativePushToken.delete({ where: { id: t.id } }).catch(() => undefined);
    else log.warn("native_push.failed", { platform: t.platform });
  }
  return sent;
}
