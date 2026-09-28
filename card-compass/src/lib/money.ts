export type Currency = "USD" | "EUR";

export function toMinor(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return null; // missing or zero means "no quote", never a real price of 0
  }
  return Math.round(amount * 100);
}

/** Format minor units in their ORIGINAL currency. No FX conversion. */
export function formatMinor(amountMinor: number, currency: Currency, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amountMinor / 100);
}
