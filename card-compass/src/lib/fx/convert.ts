import { minorExponent } from "../money";
import type { FxRates } from "./types";

const rateFor = (rates: FxRates, currency: string): number | null =>
  currency === "EUR" ? 1 : (rates.rates[currency] ?? null);

/**
 * Convert minor units between currencies via EUR cross rates.
 * Returns null when either rate is unknown (the caller must then show "unknown").
 */
export function convertMinor(amountMinor: number, from: string, to: string, fx: FxRates): number | null {
  if (from === to) return amountMinor;
  const rf = rateFor(fx, from);
  const rt = rateFor(fx, to);
  if (!rf || !rt) return null;
  const major = amountMinor / 10 ** minorExponent(from);
  return Math.round((major / rf) * rt * 10 ** minorExponent(to));
}

/** Days between the rate's reference date and now. */
export function fxAgeDays(fx: FxRates, nowMs: number): number {
  return Math.floor((nowMs - Date.parse(`${fx.date}T00:00:00Z`)) / 86_400_000);
}

/** ECB publishes on TARGET working days; allow for weekends and holidays. */
export const FX_MAX_AGE_DAYS = 5;
export const fxUsable = (fx: FxRates, nowMs: number) => fxAgeDays(fx, nowMs) <= FX_MAX_AGE_DAYS;
