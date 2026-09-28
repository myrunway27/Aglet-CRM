import { subtypeForGrade } from "./pricecharting/match";
import type { PriceReference, SourceId } from "./prices";

export interface ValuedItemInput {
  finish: string;
  language: string;
  grading: string;
  grader?: string | null;
  grade?: string | null;
  quantity: number;
}

export interface SourceValue {
  unitMinor: number;
  currency: string;
  subtype: string;
  observedAt: string;
  stale: boolean;
}

export interface ItemValuation {
  bySource: Partial<Record<SourceId, SourceValue>>;
  /** Why the item has no value, when it doesn't. */
  unpricedReason: string | null;
}

/**
 * Value one collection item from reference prices. Only like-for-like
 * references count: TCGplayer market for the exact finish, Cardmarket trend
 * (reverse-holo trend for reverse holos), PriceCharting ungraded for raw
 * copies and PriceCharting's price for the item's exact grade for graded
 * copies. Non-English copies are left unpriced (the catalog is English).
 */
export function valueItem(item: ValuedItemInput, refs: PriceReference[]): ItemValuation {
  if (item.language !== "en") return { bySource: {}, unpricedReason: "Only English printings have references" };
  const pick = (source: SourceId, finish: string, subtype: string) =>
    refs.find((r) => r.source === source && r.finish === finish && r.subtype === subtype);
  if (item.grading === "graded") {
    const sub = subtypeForGrade(item.grader, item.grade);
    const pc = sub ? pick("pricecharting", item.finish, sub) : undefined;
    if (!pc) return { bySource: {}, unpricedReason: "No graded sales price for this grade" };
    return {
      bySource: { pricecharting: { unitMinor: pc.amountMinor, currency: pc.currency, subtype: pc.subtype, observedAt: pc.observedAt, stale: pc.stale } },
      unpricedReason: null,
    };
  }
  const tcg = pick("tcgplayer", item.finish, "market");
  const cm =
    item.finish === "reverseHolofoil" ? pick("cardmarket", "reverseHolofoil", "trend") : pick("cardmarket", "unspecified", "trend");
  const pc = pick("pricecharting", item.finish, "ungraded");
  const bySource: ItemValuation["bySource"] = {};
  for (const [k, r] of [["tcgplayer", tcg], ["cardmarket", cm], ["pricecharting", pc]] as const) {
    if (r) bySource[k] = { unitMinor: r.amountMinor, currency: r.currency, subtype: r.subtype, observedAt: r.observedAt, stale: r.stale };
  }
  return { bySource, unpricedReason: Object.keys(bySource).length ? null : "No matching reference for this finish" };
}

export interface CollectionTotals {
  source: SourceId;
  currency: string;
  amountMinor: number;
  itemsPriced: number;
  itemsTotal: number;
}

/** Sum per source. Sources and currencies are never mixed. */
export function totalCollection(items: Array<{ quantity: number; valuation: ItemValuation }>): CollectionTotals[] {
  const out: CollectionTotals[] = [
    { source: "tcgplayer", currency: "USD", amountMinor: 0, itemsPriced: 0, itemsTotal: 0 },
    { source: "cardmarket", currency: "EUR", amountMinor: 0, itemsPriced: 0, itemsTotal: 0 },
    { source: "pricecharting", currency: "USD", amountMinor: 0, itemsPriced: 0, itemsTotal: 0 },
  ];
  for (const t of out) {
    for (const it of items) {
      t.itemsTotal += it.quantity;
      const v = it.valuation.bySource[t.source];
      if (v) {
        t.amountMinor += v.unitMinor * it.quantity;
        t.itemsPriced += it.quantity;
      }
    }
  }
  return out;
}

export type AlertDirection = "above" | "below";
export const meetsAlert = (value: number, direction: AlertDirection, threshold: number) =>
  direction === "above" ? value >= threshold : value <= threshold;

/**
 * Fire only on a crossing (previous value did not meet the condition) and at
 * most once per cooldown window, so a price hovering at the line doesn't spam.
 */
export function shouldTrigger(args: {
  value: number;
  previous: number | null;
  direction: AlertDirection;
  threshold: number;
  lastTriggeredAt: Date | null;
  now: number;
  cooldownMs?: number;
}): boolean {
  const { value, previous, direction, threshold, lastTriggeredAt, now } = args;
  if (!meetsAlert(value, direction, threshold)) return false;
  if (previous !== null && meetsAlert(previous, direction, threshold)) return false;
  if (lastTriggeredAt && now - lastTriggeredAt.getTime() < (args.cooldownMs ?? 86_400_000)) return false;
  return true;
}
