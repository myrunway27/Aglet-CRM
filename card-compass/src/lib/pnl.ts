import { convertMinor, fxUsable } from "./fx/convert";
import type { FxRates } from "./fx/types";
import type { SourceId } from "./prices";
import type { ItemValuation } from "./valuation";

export interface PnlInput {
  quantity: number;
  purchasePriceMinor: number | null;
  purchaseCurrency: string | null;
  valuation: ItemValuation;
}

export interface Pnl {
  /** Cost converted into the source's currency. */
  costMinor: number;
  valueMinor: number;
  gainMinor: number;
  /** Gain as a fraction of cost (0.25 = +25%). */
  gainPct: number | null;
  currency: string;
  /** True when cost was converted with FX (so the figure moves with rates). */
  converted: boolean;
}

/**
 * Profit/loss of one item against one source's reference value. Returns null
 * when anything is missing: no purchase price, no reference, or a currency
 * conversion without a current rate.
 */
export function itemPnl(item: PnlInput, source: SourceId, fx: FxRates | null, now: number): Pnl | null {
  const v = item.valuation.bySource[source];
  if (!v || item.purchasePriceMinor === null || !item.purchaseCurrency) return null;
  const cost = item.purchasePriceMinor * item.quantity;
  let costMinor = cost;
  if (item.purchaseCurrency !== v.currency) {
    if (!fx || !fxUsable(fx, now)) return null;
    const c = convertMinor(cost, item.purchaseCurrency, v.currency, fx);
    if (c === null) return null;
    costMinor = c;
  }
  const valueMinor = v.unitMinor * item.quantity;
  return {
    costMinor,
    valueMinor,
    gainMinor: valueMinor - costMinor,
    gainPct: costMinor > 0 ? (valueMinor - costMinor) / costMinor : null,
    currency: v.currency,
    converted: item.purchaseCurrency !== v.currency,
  };
}

export interface PnlTotal {
  source: SourceId;
  currency: string;
  costMinor: number;
  valueMinor: number;
  gainMinor: number;
  gainPct: number | null;
  /** Items (by quantity) that had everything needed. */
  itemsCounted: number;
  itemsTotal: number;
}

export function totalPnl(items: PnlInput[], source: SourceId, currency: string, fx: FxRates | null, now: number): PnlTotal {
  let cost = 0;
  let value = 0;
  let counted = 0;
  let total = 0;
  for (const it of items) {
    total += it.quantity;
    const p = itemPnl(it, source, fx, now);
    if (!p) continue;
    cost += p.costMinor;
    value += p.valueMinor;
    counted += it.quantity;
  }
  return {
    source,
    currency,
    costMinor: cost,
    valueMinor: value,
    gainMinor: value - cost,
    gainPct: cost > 0 ? (value - cost) / cost : null,
    itemsCounted: counted,
    itemsTotal: total,
  };
}
