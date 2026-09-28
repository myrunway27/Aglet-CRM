import { convertMinor, fxUsable } from "../fx/convert";
import type { FxRates } from "../fx/types";
import { minorExponent } from "../money";
import { isDomestic, ruleFor, RULES_REVIEWED_ON } from "./rules";

export interface LandedInput {
  itemMinor: number;
  itemCurrency: string;
  /** null = seller did not quote shipping to the buyer's country. */
  shippingMinor: number | null;
  shippingCurrency: string;
  itemCountry: string | null;
  buyerCountry: string;
  buyerCurrency: string;
}

export interface LandedLine {
  label: string;
  amountMinor: number;
  currency: string;
}

export interface LandedResult {
  status: "known" | "unknown";
  buyerCurrency: string;
  totalMinor: number | null;
  lines: LandedLine[];
  /** Why the total is unknown (empty when known). */
  missing: string[];
  /** Things the total does not include, shown next to it. */
  caveats: string[];
  ruleId: string | null;
}

/**
 * Delivered-cost estimate in the buyer's currency. Returns a total only when
 * every input is known: shipping, item location, a current FX rate, and an
 * import rule that covers this destination and value.
 */
export function estimateLanded(input: LandedInput, fx: FxRates, nowMs: number): LandedResult {
  const out: LandedResult = {
    status: "unknown",
    buyerCurrency: input.buyerCurrency,
    totalMinor: null,
    lines: [],
    missing: [],
    caveats: [],
    ruleId: null,
  };
  const cur = input.buyerCurrency;
  if (input.shippingMinor === null) out.missing.push(`Shipping to ${input.buyerCountry} not quoted`);
  if (!input.itemCountry) out.missing.push("Item location not stated");
  if (!fxUsable(fx, nowMs)) out.missing.push("No current exchange rate");

  const item = convertMinor(input.itemMinor, input.itemCurrency, cur, fx);
  const ship =
    input.shippingMinor === null ? null : convertMinor(input.shippingMinor, input.shippingCurrency, cur, fx);
  if (item === null || (input.shippingMinor !== null && ship === null)) out.missing.push(`No exchange rate for ${cur}`);
  if (item !== null) out.lines.push({ label: "Item", amountMinor: item, currency: cur });
  if (ship !== null) out.lines.push({ label: "Shipping", amountMinor: ship, currency: cur });
  if (input.itemCurrency !== cur || (input.shippingMinor !== null && input.shippingCurrency !== cur)) {
    out.caveats.push(
      `Converted at ${fx.source === "demo" ? "demo" : "ECB"} reference rates of ${fx.date}; your card issuer's rate and fees will differ.`,
    );
  }

  if (out.missing.length || item === null || ship === null || !input.itemCountry) return out;

  let charges = 0;
  if (isDomestic(input.itemCountry, input.buyerCountry)) {
    out.ruleId = "domestic";
    if (input.buyerCountry === "US") out.caveats.push("Sales tax may be added at checkout.");
    else if (input.buyerCountry === "CA" || input.buyerCountry === "AU" || input.buyerCountry === "JP")
      out.caveats.push("Domestic sales tax may be added at checkout.");
  } else {
    const rule = ruleFor(input.buyerCountry);
    if (!rule) {
      out.missing.push(`Import duty and tax for ${input.buyerCountry} are not modeled yet`);
      return out;
    }
    const itemInThreshold = convertMinor(input.itemMinor, input.itemCurrency, rule.thresholdCurrency, fx);
    const rate = rule.taxRate(input.buyerCountry);
    if (itemInThreshold === null || rate === null) {
      out.missing.push(`Import tax rate for ${input.buyerCountry} unknown`);
      return out;
    }
    if (itemInThreshold > rule.threshold * 10 ** minorExponent(rule.thresholdCurrency)) {
      out.missing.push(
        `Above the ${rule.thresholdCurrency} ${rule.threshold} low-value threshold: duty depends on customs classification`,
      );
      return out;
    }
    const tax = Math.round((item + ship) * rate);
    out.lines.push({ label: `${rule.taxLabel} (${Math.round(rate * 100)}%)`, amountMinor: tax, currency: cur });
    charges += tax;
    if (rule.flatDutyPerItem > 0) {
      const duty = convertMinor(rule.flatDutyPerItem * 10 ** minorExponent(rule.dutyCurrency), rule.dutyCurrency, cur, fx);
      if (duty === null) {
        out.missing.push("Duty could not be converted");
        return out;
      }
      out.lines.push({ label: "Customs duty (flat)", amountMinor: duty, currency: cur });
      charges += duty;
    }
    out.ruleId = rule.id;
    out.caveats.push(`Import estimate per rules reviewed ${RULES_REVIEWED_ON}. Carrier handling fees may apply.`);
  }

  out.status = "known";
  out.totalMinor = item + ship + charges;
  return out;
}
