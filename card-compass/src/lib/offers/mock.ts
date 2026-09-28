import fixture from "../../../fixtures/ebay/listings.json";
import { EU_MEMBERS } from "../landed/rules";
import { mapSummary, type EbayItemSummary } from "./ebay";
import type { Listing, OfferProvider, OfferSearch } from "./types";

type Quote = { value: string; currency: string };
type DemoItem = EbayItemSummary & { conditionDescriptors: string[]; shipping: Record<string, Quote> };
const DATA = fixture as unknown as Record<string, DemoItem[] | string>;

/**
 * Demo listings shaped like eBay Browse results. Shipping is resolved per buyer
 * country the way eBay's contextual location would. Every listing has
 * isDemo=true and no URL.
 */
export class MockOfferProvider implements OfferProvider {
  readonly id = "mock" as const;
  private details = new Map<string, string[]>();

  async search(q: OfferSearch): Promise<Listing[]> {
    const items = DATA[q.catalogId];
    if (!Array.isArray(items)) return [];
    const out: Listing[] = [];
    for (const it of items) {
      const quote = it.shipping[q.buyerCountry] ?? (EU_MEMBERS.has(q.buyerCountry) ? it.shipping.EU : undefined) ?? it.shipping["*"];
      const l = mapSummary({ ...it, shippingOptions: quote ? [{ shippingCostType: "FIXED", shippingCost: quote }] : [] }, "DEMO");
      if (!l) continue;
      this.details.set(l.listingId, it.conditionDescriptors);
      out.push({ ...l, isDemo: true, url: null, imageUrl: null });
    }
    return out;
  }

  async enrich(listing: Listing): Promise<Listing> {
    return { ...listing, conditionDescriptors: this.details.get(listing.listingId) ?? [], enriched: true };
  }
}
