import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { requireUser } from "@/lib/auth/guard";
import { toDailySeries } from "@/lib/history";
import { valueRows } from "@/lib/jobs";
import { buildPortfolio, change, dayRange, seriesKeyFor, type DayPoint, type Holding } from "@/lib/portfolio";
import { subtypeForGrade } from "@/lib/pricecharting/match";
import { SOURCES, type SourceId } from "@/lib/prices";
import { isRegion, REGIONS } from "@/lib/regions";

export const runtime = "nodejs";

const RANGES = { "7": 7, "30": 30, "90": 90 } as const;

/**
 * Portfolio view: value of the current holdings over time on ONE source (never
 * mixing currencies), with day/week change and the biggest movers.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const client = requireDb();
    const sp = new URL(req.url).searchParams;
    const eur = isRegion(user.country) && REGIONS[user.country].currency === "EUR";
    const sourceParam = sp.get("source");
    const source: SourceId = sourceParam === "tcgplayer" || sourceParam === "cardmarket" || sourceParam === "pricecharting" ? sourceParam : eur ? "cardmarket" : "tcgplayer";
    const days = RANGES[(sp.get("range") ?? "30") as keyof typeof RANGES] ?? 30;
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);

    const items = await client.collectionItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (items.length === 0) {
      return Response.json({ empty: true, source, currency: SOURCES[source].currency, range: days });
    }
    const valued = await valueRows(items, now);

    const holdings: Holding[] = items.map((i) => ({
      id: i.id,
      catalogId: i.catalogId,
      name: i.name,
      setName: i.setName,
      number: i.number,
      finish: i.finish,
      quantity: i.quantity,
      seriesKey: seriesKeyFor(source, i, subtypeForGrade),
    }));

    // Stored daily series for these cards on this source.
    const start = new Date(Date.parse(`${today}T00:00:00Z`) - (days + 45) * 86_400_000);
    const cards = await client.card.findMany({ where: { catalogId: { in: [...new Set(items.map((i) => i.catalogId))] } }, select: { id: true, catalogId: true } });
    const byCardId = new Map(cards.map((c) => [c.id, c.catalogId]));
    const rows = await client.priceSnapshot.findMany({
      where: { cardId: { in: cards.map((c) => c.id) }, source, observedAt: { gte: start } },
      select: { cardId: true, source: true, finish: true, subtype: true, amountMinor: true, observedAt: true, isDemo: true },
    });
    const grouped = new Map<string, Array<{ observedAt: Date; amountMinor: number }>>();
    for (const r of rows) {
      const k = `${byCardId.get(r.cardId)}|${r.source}|${r.finish}|${r.subtype}`;
      (grouped.get(k) ?? grouped.set(k, []).get(k)!).push(r);
    }
    const series = new Map<string, DayPoint[]>([...grouped].map(([k, v]) => [k, toDailySeries(v)]));
    // Today's point is the live valuation (same numbers as the collection page).
    valued.forEach((v, idx) => {
      const h = holdings[idx];
      const cur = v.valuation.bySource[source];
      if (!h.seriesKey || !cur) return;
      const k = `${h.catalogId}|${h.seriesKey}`;
      const s = (series.get(k) ?? []).filter((p) => p.day < today);
      s.push({ day: today, amountMinor: cur.unitMinor });
      series.set(k, s);
    });

    const range = dayRange(today, days);
    const { points, movers } = buildPortfolio(holdings, series, range);
    const counted = holdings.filter((h) => h.seriesKey && series.has(`${h.catalogId}|${h.seriesKey}`)).reduce((n, h) => n + h.quantity, 0);
    const total = holdings.reduce((n, h) => n + h.quantity, 0);
    const up = movers.filter((m) => m.toMinor > m.fromMinor).slice(0, 3);
    const down = movers.filter((m) => m.toMinor < m.fromMinor).slice(0, 3);

    return Response.json({
      empty: false,
      source,
      sourceLabel: SOURCES[source].label,
      currency: SOURCES[source].currency,
      range: days,
      points,
      nowMinor: points[points.length - 1]?.valueMinor ?? 0,
      change1d: change(points, 1),
      change7d: change(points, 7),
      changeRange: change(points, points.length - 1),
      gainers: up,
      losers: down,
      cardsCounted: counted,
      cardsTotal: total,
      isDemo: rows.some((r) => r.isDemo),
    });
  } catch (err) {
    return errorResponse(err, "portfolio");
  }
}
