export interface Listing {
  provider: "ebay";
  listingId: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  marketplace: string;
  itemMinor: number;
  itemCurrency: string;
  /** null = no shipping quote to the buyer's country. */
  shippingMinor: number | null;
  shippingCurrency: string;
  itemCountry: string | null;
  /** eBay conditionId: 2750 graded, 4000 ungraded (trading-card categories). */
  conditionId: string | null;
  condition: string | null;
  /** Condition descriptor values from item details (e.g. "Near Mint or Better"). */
  conditionDescriptors: string[];
  sellerName: string | null;
  sellerFeedbackPct: number | null;
  sellerFeedbackScore: number | null;
  /** Active asking price, not a completed sale. */
  priceKind: "asking";
  isDemo: boolean;
  /** True once item details have been fetched. */
  enriched: boolean;
}

export interface OfferSearch {
  cardName: string;
  number: string;
  setPrintedTotal: number | null;
  grader?: string;
  grade?: string;
  buyerCountry: string;
  catalogId: string;
}

export interface OfferProvider {
  readonly id: "mock" | "ebay";
  search(q: OfferSearch): Promise<Listing[]>;
  /** Fetch item details (condition descriptors). Optional. */
  enrich?(listing: Listing): Promise<Listing>;
}
