/** Currencies with no minor unit (none of our sources use them, but be safe). */
const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

export function toMinor(value: unknown, currency: string): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  return Math.round(value * factor);
}

/** Format in the ORIGINAL currency; this app never converts. */
export function formatMoney(amountMinor: number, currency: string, locale = "en-US"): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amountMinor / factor);
}

export function formatAsOf(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
}
