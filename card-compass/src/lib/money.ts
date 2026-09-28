/** Currencies the app displays. Reference prices are only ever USD or EUR. */
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const isCurrency = (c: string): c is Currency => (CURRENCIES as readonly string[]).includes(c);

/** Number of minor-unit digits (ISO 4217). JPY has none. */
export function minorExponent(currency: string): number {
  return currency === "JPY" ? 0 : 2;
}

/** Major-unit amount -> integer minor units. Missing/zero/negative means "no quote", never 0. */
export function toMinor(amount: number | null | undefined, currency: string = "USD"): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 10 ** minorExponent(currency));
}

/** Parse a decimal string such as "12.50" (APIs send strings) into minor units. */
export function parseMinor(value: string | number | null | undefined, currency: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** minorExponent(currency));
}

/** Format minor units in the given currency with an explicit ISO code. */
export function formatMinor(amountMinor: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: minorExponent(currency),
    maximumFractionDigits: minorExponent(currency),
  }).format(amountMinor / 10 ** minorExponent(currency));
}
