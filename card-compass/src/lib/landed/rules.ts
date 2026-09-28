/**
 * Import-charge rules for low-value consignments, by buyer destination.
 *
 * These encode published thresholds as understood on RULES_REVIEWED_ON. They
 * are deliberately narrow: anything outside them (higher values, unmodeled
 * countries) yields "total unknown" rather than a guess. Have a customs
 * specialist re-verify before launch and whenever regulations change.
 */
export const RULES_REVIEWED_ON = "2026-09-28";

export const EU_MEMBERS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** Standard VAT rates for the EU destinations the app offers. Others -> unknown. */
export const EU_VAT_STANDARD: Record<string, number> = { DE: 0.19, FR: 0.2, IT: 0.22, ES: 0.21, NL: 0.21 };

export interface ImportRule {
  id: string;
  /** Goods value ceiling (item price, excluding shipping) in thresholdCurrency major units. */
  threshold: number;
  thresholdCurrency: string;
  /** Tax charged on item + shipping (VAT/GST), collected at sale or on import. */
  taxRate: (country: string) => number | null;
  taxLabel: string;
  /** Flat customs duty per item, if any, in dutyCurrency major units. */
  flatDutyPerItem: number;
  dutyCurrency: string;
  summary: string;
  sourceUrl: string;
}

export const IMPORT_RULES: Record<string, ImportRule> = {
  EU: {
    id: "EU-low-value",
    threshold: 150,
    thresholdCurrency: "EUR",
    taxRate: (c) => EU_VAT_STANDARD[c] ?? null,
    taxLabel: "Import VAT",
    // EU flat customs duty on low-value e-commerce items, applicable from 1 Jul 2026.
    flatDutyPerItem: 3,
    dutyCurrency: "EUR",
    summary:
      "EU, goods ≤ €150: destination VAT on item + shipping (usually collected by the marketplace via IOSS) plus a €3 flat customs duty per item.",
    sourceUrl: "https://vat-one-stop-shop.ec.europa.eu/",
  },
  GB: {
    id: "GB-low-value",
    threshold: 135,
    thresholdCurrency: "GBP",
    taxRate: () => 0.2,
    taxLabel: "UK VAT",
    flatDutyPerItem: 0,
    dutyCurrency: "GBP",
    summary: "UK, goods ≤ £135: 20% VAT on item + shipping, charged at the point of sale; no customs duty.",
    sourceUrl: "https://www.gov.uk/goods-sent-from-abroad/tax-and-duty",
  },
  AU: {
    id: "AU-low-value",
    threshold: 1000,
    thresholdCurrency: "AUD",
    taxRate: () => 0.1,
    taxLabel: "GST",
    flatDutyPerItem: 0,
    dutyCurrency: "AUD",
    summary: "Australia, goods ≤ A$1,000: 10% GST on item + shipping, collected by the marketplace; no duty.",
    sourceUrl: "https://www.ato.gov.au/",
  },
};

export function ruleFor(buyerCountry: string): ImportRule | null {
  if (EU_MEMBERS.has(buyerCountry)) return IMPORT_RULES.EU;
  return IMPORT_RULES[buyerCountry] ?? null;
}

/** Same customs territory: no import charges. */
export function isDomestic(itemCountry: string, buyerCountry: string): boolean {
  return itemCountry === buyerCountry || (EU_MEMBERS.has(itemCountry) && EU_MEMBERS.has(buyerCountry));
}
