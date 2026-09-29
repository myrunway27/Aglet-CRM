import { createHash, timingSafeEqual } from "node:crypto";
import { errorResponse } from "@/lib/api";
import { env } from "@/lib/env";
import { checkAlerts, snapshotAllCollections, snapshotWishlistCards } from "@/lib/jobs";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(secret));
}

/** Scheduled job: check price alerts and snapshot collection values. Call daily or hourly. */
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: { code: "unauthorized", message: "Bad cron secret." } }, { status: 401 });
  try {
    const alerts = await checkAlerts();
    const collections = await snapshotAllCollections();
    const wishlist = await snapshotWishlistCards();
    return Response.json({ ok: true, alerts, collections, wishlist });
  } catch (err) {
    return errorResponse(err, "cron");
  }
}

/** Vercel Cron calls with GET and the same "Authorization: Bearer $CRON_SECRET" header. */
export const GET = POST;
