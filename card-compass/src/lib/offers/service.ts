import type { CatalogCard } from "../catalog/types";
import { fxUsable } from "../fx/convert";
import type { FxRates } from "../fx/types";
import { estimateLanded, type LandedResult } from "../landed/landed";
import type { Selection } from "../selection";
import type { Listing, OfferProvider } from "./types";
import { verifyListing, type SellerPolicy, type Verification } from "./verify";

export interface EvaluatedOffer {
  listing: Listing;
  verification: Verification;
  landed: LandedResult;
  /** Only verified matches with a fully known delivered cost are ranked. */
  rankable: boolean;
}

export interface OffersResult {
  provider: "mock" | "ebay";
  isDemo: boolean;
  buyerCountry: string;
  buyerCurrency: string;
  fx: { date: string; source: FxRates["source"]; sourceUrl: string | null; usable: boolean };
  ranked: EvaluatedOffer[];
  totalUnknown: EvaluatedOffer[];
  unverified: EvaluatedOffer[];
  excluded: EvaluatedOffer[];
  searchedAt: string;
}

/** Max item-detail lookups per request (each costs an API call). */
export const MAX_ENRICH = 8;

export async function evaluateOffers(args: {
  provider: OfferProvider;
  card: CatalogCard;
  selection: Selection;
  buyerCountry: string;
  buyerCurrency: string;
  fx: FxRates;
  policy: SellerPolicy;
  now: number;
}): Promise<OffersResult> {
  const { provider, card, selection, buyerCountry, buyerCurrency, fx, policy, now } = args;
  let listings = await provider.search({
    catalogId: card.catalogId,
    cardName: card.name,
    number: card.number,
    setPrintedTotal: card.setPrintedTotal,
    grader: selection.grader,
    grade: selection.grade,
    buyerCountry,
  });

  const evaluate = (l: Listing): EvaluatedOffer => {
    const verification = verifyListing(l, card, selection, policy);
    const landed = estimateLanded(
      {
        itemMinor: l.itemMinor,
        itemCurrency: l.itemCurrency,
        shippingMinor: l.shippingMinor,
        shippingCurrency: l.shippingCurrency,
        itemCountry: l.itemCountry,
        buyerCountry,
        buyerCurrency,
      },
      fx,
      now,
    );
    return { listing: l, verification, landed, rankable: verification.verdict === "match" && landed.status === "known" };
  };

  // Raw cards: condition is only in item details. Enrich the most promising
  // listings whose only open question is condition.
  if (provider.enrich && selection.grading === "raw") {
    const first = listings.map(evaluate);
    const needs = first
      .filter((e) => e.verification.verdict === "unverified" && e.verification.checks.condition === "unknown")
      .filter((e) => Object.entries(e.verification.checks).every(([k, v]) => k === "condition" || v !== "mismatch"))
      .sort((a, b) => (a.landed.totalMinor ?? Infinity) - (b.landed.totalMinor ?? Infinity))
      .slice(0, MAX_ENRICH)
      .map((e) => e.listing.listingId);
    const enriched = await Promise.all(
      listings.map((l) => (needs.includes(l.listingId) ? provider.enrich!(l).catch(() => l) : Promise.resolve(l))),
    );
    listings = enriched;
  }

  const all = listings.map(evaluate);
  const byTotal = (a: EvaluatedOffer, b: EvaluatedOffer) =>
    (a.landed.totalMinor ?? Infinity) - (b.landed.totalMinor ?? Infinity) ||
    a.listing.itemMinor - b.listing.itemMinor;
  return {
    provider: provider.id,
    isDemo: provider.id === "mock",
    buyerCountry,
    buyerCurrency,
    fx: { date: fx.date, source: fx.source, sourceUrl: fx.sourceUrl, usable: fxUsable(fx, now) },
    ranked: all.filter((e) => e.rankable).sort(byTotal),
    totalUnknown: all.filter((e) => e.verification.verdict === "match" && !e.rankable),
    unverified: all.filter((e) => e.verification.verdict === "unverified"),
    excluded: all.filter((e) => e.verification.verdict === "mismatch"),
    searchedAt: new Date(now).toISOString(),
  };
}
