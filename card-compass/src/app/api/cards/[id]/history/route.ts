import { errorResponse } from "@/lib/api";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { toDailySeries } from "@/lib/history";

export const runtime = "nodejs";

/**
 * Stored reference-price history for one card: TCGplayer market (per finish)
 * and Cardmarket trend. Built from the snapshots this app has recorded, so it
 * starts when the card was first looked up or tracked.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/cards/[id]/history">) {
  try {
    const { id } = await ctx.params;
    if (!CATALOG_ID_RE.test(id)) throw new NotFoundError("Invalid card id");
    const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 90));
    const client = db();
    if (!client) return Response.json({ series: [] });
    // History is optional: a database hiccup shows "no history" rather than an error.
    const card = await client.card.findUnique({ where: { catalogId: id } }).catch(() => null);
    if (!card) return Response.json({ series: [] });
    const rows = await client.priceSnapshot.findMany({
      where: {
        cardId: card.id,
        subtype: { in: ["market", "trend"] },
        observedAt: { gte: new Date(Date.now() - days * 86_400_000) },
      },
      orderBy: { observedAt: "asc" },
    }).catch(() => []);
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = `${r.source}|${r.subtype}|${r.finish}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
    }
    return Response.json({
      series: [...groups.entries()].map(([k, list]) => {
        const [source, subtype, finish] = k.split("|");
        return { source, subtype, finish, currency: list[0].currency, isDemo: list.some((r) => r.isDemo), points: toDailySeries(list) };
      }),
    });
  } catch (err) {
    return errorResponse(err, "history");
  }
}
