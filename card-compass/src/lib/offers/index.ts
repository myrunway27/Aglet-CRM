import "server-only";
import { env } from "../env";
import { EbayBrowseProvider } from "./ebay";
import { MockOfferProvider } from "./mock";
import type { OfferProvider } from "./types";

let provider: OfferProvider | null | undefined;

/** null when live offers are switched off or eBay credentials are missing. */
export function getOfferProvider(): OfferProvider | null {
  if (provider !== undefined) return provider;
  const e = env();
  if (e.OFFERS_PROVIDER === "ebay" && e.EBAY_CLIENT_ID && e.EBAY_CLIENT_SECRET) {
    provider = new EbayBrowseProvider({
      clientId: e.EBAY_CLIENT_ID,
      clientSecret: e.EBAY_CLIENT_SECRET,
      marketplaces: e.EBAY_MARKETPLACES.split(",").map((m) => m.trim()).filter(Boolean),
      perDay: e.EBAY_LIMIT_PER_DAY,
      perMinute: e.EBAY_LIMIT_PER_MINUTE,
    });
  } else if (e.OFFERS_PROVIDER === "mock") {
    provider = new MockOfferProvider();
  } else {
    provider = null;
  }
  return provider;
}
