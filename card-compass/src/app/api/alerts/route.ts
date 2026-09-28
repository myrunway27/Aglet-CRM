import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { ValidationError } from "@/lib/errors";
import { parseMinor } from "@/lib/money";
import { SOURCES } from "@/lib/prices";
import { nativePushEnabled } from "@/lib/native-push";
import { pushEnabled } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const client = requireDb();
    const [alerts, notifications, pushSubs] = await Promise.all([
      client.priceAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      client.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      client.pushSubscription.count({ where: { userId: user.id } }),
    ]);
    return Response.json({ alerts, notifications, push: { enabled: pushEnabled(), devices: pushSubs, native: nativePushEnabled() } });
  } catch (err) {
    return errorResponse(err, "alerts.get");
  }
}

const NewAlert = z.object({
  catalogId: z.string().regex(CATALOG_ID_RE),
  finish: z.string().regex(/^[A-Za-z0-9]{1,32}$/),
  source: z.enum(["tcgplayer", "cardmarket"]),
  subtype: z.enum(["market", "low", "mid", "trend", "averageSell", "avg7", "avg30"]),
  direction: z.enum(["above", "below"]),
  threshold: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price like 12.50"),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = NewAlert.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid alert.");
    const a = body.data;
    if (a.source === "tcgplayer" && !["market", "low", "mid"].includes(a.subtype)) throw new ValidationError("Unsupported price type for TCGplayer.");
    if (a.source === "cardmarket" && !["trend", "averageSell", "low", "avg7", "avg30"].includes(a.subtype)) throw new ValidationError("Unsupported price type for Cardmarket.");
    if ((await client.priceAlert.count({ where: { userId: user.id, active: true } })) >= 100) throw new ValidationError("Alert limit reached (100).");
    const { card } = await getCatalog().getCard(a.catalogId);
    const currency = SOURCES[a.source].currency;
    const alert = await client.priceAlert.create({
      data: {
        userId: user.id,
        catalogId: a.catalogId,
        cardName: `${card.name} (${card.setName} #${card.number})`,
        finish: a.source === "cardmarket" && a.finish !== "reverseHolofoil" ? "unspecified" : a.finish,
        source: a.source,
        subtype: a.subtype,
        currency,
        direction: a.direction,
        thresholdMinor: parseMinor(a.threshold, currency)!,
      },
    });
    return Response.json({ ok: true, id: alert.id });
  } catch (err) {
    return errorResponse(err, "alerts.create");
  }
}
