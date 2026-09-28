import "server-only";
import webpush from "web-push";
import { db } from "./db";
import { env } from "./env";
import { log } from "./log";

let configured: boolean | undefined;

export function pushEnabled(): boolean {
  if (configured !== undefined) return configured;
  const e = env();
  configured = Boolean(e.NEXT_PUBLIC_VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY && e.VAPID_SUBJECT);
  if (configured) webpush.setVapidDetails(e.VAPID_SUBJECT!, e.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, e.VAPID_PRIVATE_KEY!);
  return configured;
}

/** Send to every device the user subscribed. Expired subscriptions are removed. */
export async function pushToUser(userId: string, payload: { title: string; body: string; url: string }) {
  const client = db();
  if (!client || !pushEnabled()) return 0;
  const subs = await client.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 86_400 },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await client.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
      else log.warn("push.send_failed", { status: status ?? null });
    }
  }
  return sent;
}
