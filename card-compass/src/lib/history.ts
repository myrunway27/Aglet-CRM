export interface SnapshotRow {
  catalogId: string;
  name: string;
  setName: string;
  source: string;
  subtype: string;
  finish: string;
  currency: string;
  amountMinor: number;
  observedAt: Date;
  isDemo: boolean;
}

export interface SeriesPoint {
  day: string;
  amountMinor: number;
}

/** One point per day (last observation wins), ascending. */
export function toDailySeries(rows: Array<{ observedAt: Date; amountMinor: number }>): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const r of [...rows].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime())) {
    byDay.set(r.observedAt.toISOString().slice(0, 10), r.amountMinor);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, amountMinor]) => ({ day, amountMinor }));
}

export interface Mover {
  catalogId: string;
  name: string;
  setName: string;
  source: string;
  subtype: string;
  finish: string;
  currency: string;
  fromMinor: number;
  toMinor: number;
  fromDay: string;
  toDay: string;
  changePct: number;
  isDemo: boolean;
}

/**
 * Price change over a window per (card, source, subtype, finish): latest
 * observation vs the latest one at least `windowDays` older. Series whose
 * latest point is stale, or whose prices sit below `minMinor`, are ignored so
 * penny cards don't dominate with huge percentages.
 */
export function computeMovers(
  rows: SnapshotRow[],
  opts: { windowDays: number; now: number; minMinor: number; maxAgeDays?: number },
): Mover[] {
  const groups = new Map<string, SnapshotRow[]>();
  for (const r of rows) {
    const k = `${r.catalogId}|${r.source}|${r.subtype}|${r.finish}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const out: Mover[] = [];
  const maxAge = (opts.maxAgeDays ?? 3) * 86_400_000;
  for (const list of groups.values()) {
    list.sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
    const last = list[list.length - 1];
    if (opts.now - last.observedAt.getTime() > maxAge) continue;
    const cutoff = last.observedAt.getTime() - opts.windowDays * 86_400_000;
    const base = [...list].reverse().find((r) => r.observedAt.getTime() <= cutoff);
    if (!base) continue;
    if (base.amountMinor < opts.minMinor && last.amountMinor < opts.minMinor) continue;
    out.push({
      catalogId: last.catalogId,
      name: last.name,
      setName: last.setName,
      source: last.source,
      subtype: last.subtype,
      finish: last.finish,
      currency: last.currency,
      fromMinor: base.amountMinor,
      toMinor: last.amountMinor,
      fromDay: base.observedAt.toISOString().slice(0, 10),
      toDay: last.observedAt.toISOString().slice(0, 10),
      changePct: (last.amountMinor - base.amountMinor) / base.amountMinor,
      isDemo: last.isDemo,
    });
  }
  return out;
}
