import { describe, expect, it, vi } from "vitest";
import { MockCatalogProvider } from "@/lib/catalog/mock";
import type { FxRates } from "@/lib/fx/types";
import { buildEbayQuery, EbayBrowseProvider, mapSummary } from "@/lib/offers/ebay";
import { MockOfferProvider } from "@/lib/offers/mock";
import { evaluateOffers } from "@/lib/offers/service";
import type { Listing } from "@/lib/offers/types";
import { parseCondition, verifyListing } from "@/lib/offers/verify";
import type { Selection } from "@/lib/selection";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const fx: FxRates = { base: "EUR", date: "2026-09-26", rates: { USD: 1.1, GBP: 0.85, JPY: 160, AUD: 1.6, CAD: 1.5 }, source: "demo", sourceUrl: null };
const policy = { minFeedbackPct: 98, minFeedbackScore: 20 };
const catalog = new MockCatalogProvider(undefined, () => Date.parse("2026-09-28T12:00:00Z"));
const rawRev: Selection = { finish: "reverseHolofoil", lang: "en", grading: "raw", condition: "NM" };

function listing(over: Partial<Listing>): Listing {
  return {
    provider: "ebay", listingId: "x", title: "", url: null, imageUrl: null, marketplace: "EBAY_US",
    itemMinor: 100, itemCurrency: "USD", shippingMinor: 100, shippingCurrency: "USD", itemCountry: "US",
    conditionId: "4000", condition: "Ungraded", conditionDescriptors: ["Near Mint or Better"],
    sellerName: "s", sellerFeedbackPct: 99.9, sellerFeedbackScore: 500, priceKind: "asking", isDemo: false, enriched: true,
    ...over,
  };
}

describe("verifyListing", async () => {
  const { card } = await catalog.getCard("fxa-25");
  const v = (title: string, sel: Selection = rawRev, over: Partial<Listing> = {}) => verifyListing(listing({ title, ...over }), card, sel, policy);

  it("accepts the exact print, finish, language and condition", () => {
    expect(v("Pikachu 025/198 Reverse Holo Fixture Alpha NM").verdict).toBe("match");
  });
  it.each([
    ["Pikachu 025/108 Reverse Holo", /Different collector number/],
    ["Pikachu 025/198 Reverse Holo Japanese", /not English/],
    ["PSA 10 Pikachu 025/198 Reverse Holo", /graded/],
    ["Pikachu 025/198 Reverse Holo x4 playset", /lot/],
    ["Raichu 026/198 Reverse Holo", /doesn't contain "Pikachu"/],
  ])("rejects %s", (title, re) => {
    const r = v(title);
    expect(r.verdict).toBe("mismatch");
    expect(r.reasons.join(" ")).toMatch(re);
  });
  it("rejects a reverse holo when the buyer wants the normal finish", () => {
    expect(v("Pikachu 025/198 Reverse Holo", { ...rawRev, finish: "normal" }).verdict).toBe("mismatch");
  });
  it("marks missing number, unstated reverse, unknown condition and weak sellers as unverified", () => {
    expect(v("Pikachu Reverse Holo").verdict).toBe("unverified");
    expect(v("Pikachu 025/198").verdict).toBe("unverified");
    expect(v("Pikachu 025/198 Reverse Holo", rawRev, { conditionDescriptors: [], condition: "Ungraded" }).checks.condition).toBe("unknown");
    expect(v("Pikachu 025/198 Reverse Holo", rawRev, { sellerFeedbackPct: 91, sellerFeedbackScore: 12 }).checks.seller).toBe("unknown");
  });
  it("rejects a lower condition", () => {
    const r = v("Pikachu 025/198 Reverse Holo", rawRev, { conditionDescriptors: ["Lightly Played (Excellent)"] });
    expect(r.reasons.join(" ")).toMatch(/Condition LP is below NM/);
  });
  it("distinguishes Charizard from Charizard ex", async () => {
    const { card: plain } = await catalog.getCard("fxb-4");
    const r = verifyListing(listing({ title: "Charizard ex 004/108" }), plain, { ...rawRev, finish: "holofoil" }, policy);
    expect(r.checks.print).toBe("mismatch");
  });
  it("matches graded grader+grade", async () => {
    const { card: cz } = await catalog.getCard("fxa-125");
    const sel: Selection = { finish: "holofoil", lang: "en", grading: "graded", grader: "PSA", grade: "10" };
    expect(verifyListing(listing({ title: "PSA 10 Charizard ex 125/198", conditionId: "2750" }), cz, sel, policy).verdict).toBe("match");
    expect(verifyListing(listing({ title: "PSA 9 Charizard ex 125/198", conditionId: "2750" }), cz, sel, policy).checks.grading).toBe("mismatch");
  });
  it("parses condition text", () => {
    expect(parseCondition("Near Mint or Better")).toBe("NM");
    expect(parseCondition("Moderately Played (Very Good)")).toBe("MP");
    expect(parseCondition("Pikachu 60 HP")).toBeNull();
  });
});

describe("evaluateOffers with demo listings", () => {
  it("ranks only verified listings with a known total, cheapest first, per buyer country", async () => {
    const { card } = await catalog.getCard("fxa-25");
    const us = await evaluateOffers({ provider: new MockOfferProvider(), card, selection: rawRev, buyerCountry: "US", buyerCurrency: "USD", fx, policy, now: NOW });
    expect(us.ranked.map((o) => o.listing.listingId)).toEqual(["demo|1001|0"]);
    // DE seller ships to US, but imports into the US are not modeled -> total unknown
    expect(us.totalUnknown.map((o) => o.listing.listingId)).toEqual(expect.arrayContaining(["demo|1002|0", "demo|1011|0"]));
    expect(us.excluded.length).toBeGreaterThanOrEqual(5);

    const de = await evaluateOffers({ provider: new MockOfferProvider(), card, selection: rawRev, buyerCountry: "DE", buyerCurrency: "EUR", fx, policy, now: NOW });
    const ids = de.ranked.map((o) => o.listing.listingId);
    expect(ids[0]).toBe("demo|1002|0"); // domestic DE listing is cheapest delivered
    expect(ids).toContain("demo|1001|0"); // US listing with VAT + duty
    const totals = de.ranked.map((o) => o.landed.totalMinor!);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });

  it("returns nothing for a card with no listings", async () => {
    const { card } = await catalog.getCard("fxg-6");
    const r = await evaluateOffers({ provider: new MockOfferProvider(), card, selection: { ...rawRev, finish: "normal" }, buyerCountry: "US", buyerCurrency: "USD", fx, policy, now: NOW });
    expect(r.ranked).toEqual([]);
  });
});

describe("eBay adapter", () => {
  it("builds a padded number query", () => {
    expect(buildEbayQuery({ catalogId: "x", cardName: "Pikachu", number: "25", setPrintedTotal: 198, buyerCountry: "US" })).toBe("Pikachu 025/198");
    expect(buildEbayQuery({ catalogId: "x", cardName: "Pikachu", number: "TG05", setPrintedTotal: 198, buyerCountry: "US", grader: "PSA", grade: "10" })).toBe("Pikachu TG05 PSA 10");
  });

  it("maps summaries, picks the cheapest shipping, and drops unpriced items", () => {
    const l = mapSummary(
      {
        itemId: "v1|1|0",
        title: "t",
        price: { value: "3.50", currency: "USD" },
        itemWebUrl: "https://www.ebay.com/itm/1",
        shippingOptions: [{ shippingCost: { value: "4.00", currency: "USD" } }, { shippingCost: { value: "1.25", currency: "USD" } }],
        itemLocation: { country: "US" },
        seller: { username: "u", feedbackPercentage: "99.1", feedbackScore: 50 },
      },
      "EBAY_US",
    )!;
    expect(l).toMatchObject({ itemMinor: 350, shippingMinor: 125, url: "https://www.ebay.com/itm/1", sellerFeedbackPct: 99.1 });
    expect(mapSummary({ itemId: "v1|2|0", title: "t" }, "EBAY_US")).toBeNull();
    expect(mapSummary({ itemId: "v1|3|0", title: "t", price: { value: "1", currency: "USD" }, itemWebUrl: "https://evil.test/x" }, "EBAY_US")!.url).toBeNull();
  });

  it("uses client-credentials, sends marketplace + delivery context, and dedupes across marketplaces", async () => {
    const summary = { itemId: "v1|9|0", title: "Pikachu 025/198", price: { value: "1.00", currency: "USD" }, itemLocation: { country: "US" } };
    const f = vi.fn(async (url: string) =>
      url.includes("oauth2")
        ? Response.json({ access_token: "tok", expires_in: 7200 })
        : Response.json({ itemSummaries: [summary] }),
    );
    const p = new EbayBrowseProvider({ clientId: "id", clientSecret: "sec", marketplaces: ["EBAY_US", "EBAY_DE"], perDay: 100, perMinute: 100, fetchImpl: f as unknown as typeof fetch, sleep: async () => {} });
    const out = await p.search({ catalogId: "x", cardName: "Pikachu", number: "25", setPrintedTotal: 198, buyerCountry: "DE" });
    expect(out).toHaveLength(1);
    const calls = f.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.filter(([u]) => u.includes("oauth2"))).toHaveLength(1); // token cached
    const [searchUrl, init] = calls[1];
    const h = init.headers as Record<string, string>;
    expect(h["X-EBAY-C-MARKETPLACE-ID"]).toBe("EBAY_US");
    expect(decodeURIComponent(h["X-EBAY-C-ENDUSERCTX"])).toBe("contextualLocation=country=DE");
    expect(new URL(searchUrl).searchParams.get("filter")).toBe("buyingOptions:{FIXED_PRICE},deliveryCountry:DE");
    expect(searchUrl).not.toContain("sec");
  });

  it("keeps results from marketplaces that worked when one fails", async () => {
    let n = 0;
    const f = vi.fn(async (url: string) => {
      if (url.includes("oauth2")) return Response.json({ access_token: "tok", expires_in: 7200 });
      n++;
      return n === 1 ? Response.json({}, { status: 500 }) : Response.json({ itemSummaries: [{ itemId: "a", title: "t", price: { value: "1", currency: "EUR" } }] });
    });
    const p = new EbayBrowseProvider({ clientId: "id", clientSecret: "s", marketplaces: ["EBAY_US", "EBAY_DE"], perDay: 100, perMinute: 100, fetchImpl: f as unknown as typeof fetch, sleep: async () => {} });
    await expect(p.search({ catalogId: "x", cardName: "P", number: "1", setPrintedTotal: null, buyerCountry: "US" })).resolves.toHaveLength(1);
  });
});
