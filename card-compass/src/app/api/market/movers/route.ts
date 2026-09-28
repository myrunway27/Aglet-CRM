import { errorResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { computeMovers, type SnapshotRow } from "@/lib/history";

export const runtime = "nodejs";

/**
 * Biggest reference-price moves over 7 or 30 days, among cards whose history
 * this app has stored (cards people looked up, collect, wishlist or alert on).
 */
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const windowDays = sp.get("window") === "30" ? 30 : 7;
    const client = db();
    if (!client) return Response.json({ windowDays, gainers: [], losers: [], cardsTracked: 0 });
    const now = Date.now();
    const rows = await client.priceSnapshot.findMany({
      where: {
        OR: [
          { source: "tcgplayer", subtype: "market" },
          { source: "cardmarket", subtype: "trend" },
        ],
        observedAt: { gte: new Date(now - (windowDays + 10) * 86_400_000) },
      },
      include: { card: { select: { catalogId: true, name: true, setName: true } } },
      take: 50_000,
    });
    const snap: SnapshotRow[] = rows.map((r) => ({
      catalogId: r.card.catalogId,
      name: r.card.name,
      setName: r.card.setName,
      source: r.source,
      subtype: r.subtype,
      finish: r.finish,
      currency: r.currency,
      amountMinor: r.amountMinor,
      observedAt: r.observedAt,
      isDemo: r.isDemo,
    }));
    const movers = computeMovers(snap, { windowDays, now, minMinor: 100 });
    const gainers = movers.filter((m) => m.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 20);
    const losers = movers.filter((m) => m.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 20);
    return Response.json({
      windowDays,
      gainers,
      losers,
      cardsTracked: new Set(snap.map((s) => s.catalogId)).size,
      isDemo: snap.some((s) => s.isDemo),
    });
  } catch (err) {
    return errorResponse(err, "movers");
  }
}
