/** Buyer countries the app supports, with local currency and eBay marketplace. */
export const REGIONS = {
  US: { label: "United States", currency: "USD", marketplace: "EBAY_US" },
  GB: { label: "United Kingdom", currency: "GBP", marketplace: "EBAY_GB" },
  DE: { label: "Germany", currency: "EUR", marketplace: "EBAY_DE" },
  FR: { label: "France", currency: "EUR", marketplace: "EBAY_FR" },
  IT: { label: "Italy", currency: "EUR", marketplace: "EBAY_IT" },
  ES: { label: "Spain", currency: "EUR", marketplace: "EBAY_ES" },
  NL: { label: "Netherlands", currency: "EUR", marketplace: "EBAY_NL" },
  CA: { label: "Canada", currency: "CAD", marketplace: "EBAY_CA" },
  AU: { label: "Australia", currency: "AUD", marketplace: "EBAY_AU" },
  JP: { label: "Japan", currency: "JPY", marketplace: "EBAY_US" },
} as const;
export type Region = keyof typeof REGIONS;
export const REGION_CODES = Object.keys(REGIONS) as [Region, ...Region[]];
export const isRegion = (c: string): c is Region => c in REGIONS;
