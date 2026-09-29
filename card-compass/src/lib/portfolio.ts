import type { SourceId } from "./prices";

export interface Holding {
  /** Unique per collection row. */
  id: string;
  catalogId: string;
  name: string;
  setName: string;
  number: string;
  finish: string;
  quantity: number;
  /** Series key: which stored price series values this holding on this source. */
  seriesKey: string | null;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD
  amountMinor: number;
}

export interface PortfolioPoint {
  day: string;
  valueMinor: number;
  /** Cards (by quantity) with a known price on that day. */
  cardsPriced: number;
}

export interface Mover {
  holdingId: string;
  catalogId: string;
  name: string;
  setName: string;
  number: string;
  finish: string;
  fromMinor: number;
  toMinor: number;
  changePct: number;
}

/** Which stored series values an item on a given source (same rules as valueItem). */
export function seriesKeyFor(
  source: SourceId,
  item: { finish: string; language: string; grading: string; grader?: string | null; grade?: string | null },
  gradeSubtype: (grader?: string | null, grade?: string | null) => string | null,
): string | null {
  if (item.language !== "en") return null;
  if (item.grading === "graded") {
    if (source !== "pricecharting") return null;
    const sub = gradeSubtype(item.grader, item.grade);
    return sub ? `pricecharting|${item.finish}|${sub}` : null;
  }
  if (source === "tcgplayer") return `tcgplayer|${item.finish}|market`;
  if (source === "cardmarket") return `cardmarket|${item.finish === "reverseHolofoil" ? "reverseHolofoil" : "unspecified"}|trend`;
  return `pricecharting|${item.finish}|ungraded`;
}

/** Inclusive list of YYYY-MM-DD days ending at `end`. */
export function dayRange(end: string, days: number): string[] {
  const t = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => new Date(t - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

/** Last known value on or before `day` (prices carry forward; never backwards). */
function valueOn(series: DayPoint[], day: string): number | null {
  let v: number | null = null;
  for (const p of series) {
    if (p.day > day) break;
    v = p.amountMinor;
  }
  return v;
}

/**
 * Value of the current holdings on each day, using each holding's own price
 * series. A holding only counts from the first day its price is known, so the
 * line never includes invented history.
 */
export function buildPortfolio(holdings: Holding[], series: Map<string, DayPoint[]>, days: string[]) {
  const sorted = new Map([...series].map(([k, v]) => [k, [...v].sort((a, b) => a.day.localeCompare(b.day))]));
  const points: PortfolioPoint[] = days.map((day) => {
    let value = 0;
    let cards = 0;
    for (const h of holdings) {
      const s = h.seriesKey ? sorted.get(`${h.catalogId}|${h.seriesKey}`) : undefined;
      const v = s ? valueOn(s, day) : null;
      if (v === null) continue;
      value += v * h.quantity;
      cards += h.quantity;
    }
    return { day, valueMinor: value, cardsPriced: cards };
  });

  const first = days[0];
  const last = days[days.length - 1];
  const movers: Mover[] = [];
  for (const h of holdings) {
    const s = h.seriesKey ? sorted.get(`${h.catalogId}|${h.seriesKey}`) : undefined;
    if (!s) continue;
    const from = valueOn(s, first);
    const to = valueOn(s, last);
    if (from === null || to === null || from === 0 || from === to) continue;
    movers.push({
      holdingId: h.id,
      catalogId: h.catalogId,
      name: h.name,
      setName: h.setName,
      number: h.number,
      finish: h.finish,
      fromMinor: from * h.quantity,
      toMinor: to * h.quantity,
      changePct: (to - from) / from,
    });
  }
  movers.sort((a, b) => Math.abs(b.toMinor - b.fromMinor) - Math.abs(a.toMinor - a.fromMinor));
  return { points, movers };
}

/** Change between two points, or null when the earlier value is unknown/zero. */
export function change(points: PortfolioPoint[], back: number) {
  const last = points[points.length - 1];
  const prev = points[points.length - 1 - back];
  if (!last || !prev || prev.valueMinor === 0) return null;
  return { minor: last.valueMinor - prev.valueMinor, pct: (last.valueMinor - prev.valueMinor) / prev.valueMinor };
}

/** Species for browse-by-Pokémon grouping: "Charizard ex" -> "Charizard", "Pikachu V" -> "Pikachu". */
export function speciesOf(cardName: string): string {
  return cardName
    .replace(/\s+(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.?\s?X|Prime|δ|◇|☆|Star)$/u, "")
    .replace(/^(Radiant|Shining|Dark|Light|Galarian|Alolan|Hisuian|Paldean)\s+/u, "")
    .trim();
}
