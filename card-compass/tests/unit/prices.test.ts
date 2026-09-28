import { describe, expect, it } from "vitest";
import { MockCatalog } from "@/lib/catalog/mock";
import { extractPriceReferences, parseSourceDate, standardFinish } from "@/lib/price/pokemontcg-prices";
import { buildReferenceView, isStale, type Selection } from "@/lib/price/select";

const now = new Date("2026-09-28T12:00:00Z");
const opts = { now, staleAfterDays: 7 };
const raw: Selection = { finish: "normal", language: "English", grading: "raw", condition: "Near Mint" };

// Synthetic record in the documented Pokémon TCG API v2 card shape (values are test data).
const apiCard = {
  tcgplayer: {
    url: "https://prices.pokemontcg.io/tcgplayer/xy1-1",
    updatedAt: "2026/09/27",
    prices: {
      normal: { low: 0.1, mid: 0.25, high: 2, market: 0.2, directLow: null },
      reverseHolofoil: { low: 0.5, mid: 1, high: 5, market: 0.8 },
    },
  },
  cardmarket: {
    url: "https://prices.pokemontcg.io/cardmarket/xy1-1",
    updatedAt: "2026/09/27",
    prices: { trendPrice: 0.15, averageSellPrice: 0.2, lowPrice: 0.02, avg30: 0.18, reverseHoloTrend: 0.6, reverseHoloSell: 0 },
  },
};

describe("extractPriceReferences", () => {
  const refs = extractPriceReferences(apiCard, ["normal", "reverseHolofoil"]);

  it("keeps source, currency, subtype, finish, as-of date and link", () => {
    const market = refs.find((r) => r.source === "tcgplayer" && r.finish === "normal" && r.subtype === "market");
    expect(market).toMatchObject({
      currency: "USD",
      amountMinor: 20,
      observedAt: "2026-09-27T00:00:00.000Z",
      sourceUrl: "https://prices.pokemontcg.io/tcgplayer/xy1-1",
      demo: false,
    });
  });

  it("drops null and zero values instead of inventing a price", () => {
    expect(refs.some((r) => r.subtype === "directLow")).toBe(false);
    expect(refs.some((r) => r.source === "cardmarket" && r.finish === "reverseHolofoil" && r.subtype === "averageSell")).toBe(false);
  });

  it("splits Cardmarket reverse-holo fields from standard ones", () => {
    const cm = refs.filter((r) => r.source === "cardmarket");
    expect(cm.find((r) => r.finish === "reverseHolofoil" && r.subtype === "trend")?.amountMinor).toBe(60);
    expect(cm.find((r) => r.finish === "normal" && r.subtype === "trend")?.amountMinor).toBe(15);
  });

  it("skips a source whose date is missing or malformed", () => {
    const bad = { tcgplayer: { ...apiCard.tcgplayer, updatedAt: "yesterday" } };
    expect(extractPriceReferences(bad, ["normal"])).toEqual([]);
  });

  it("rejects non-allowlisted source links", () => {
    const evil = { tcgplayer: { ...apiCard.tcgplayer, url: "javascript:alert(1)" } };
    expect(extractPriceReferences(evil, ["normal"])[0]?.sourceUrl).toBeNull();
  });

  it("does not attribute Cardmarket standard prices when the finish is ambiguous", () => {
    expect(standardFinish(["normal", "holofoil"])).toBeNull();
    const r = extractPriceReferences({ cardmarket: apiCard.cardmarket }, ["normal", "holofoil"]);
    expect(r).toEqual([]);
  });

  it("parses source dates strictly", () => {
    expect(parseSourceDate("2026/02/30")).toBe("2026-03-02T00:00:00.000Z"); // JS Date rolls over; format still valid
    expect(parseSourceDate("27.09.2026")).toBeNull();
  });
});

describe("buildReferenceView", () => {
  const refs = extractPriceReferences(apiCard, ["normal", "reverseHolofoil"]);

  it("shows only the selected finish per source", () => {
    const v = buildReferenceView(refs, raw, opts);
    const tcg = v.blocks.find((b) => b.source === "tcgplayer")!;
    expect(tcg.status).toBe("ok");
    expect(tcg.rows.every((r) => r.finish === "normal")).toBe(true);
    expect(v.otherFinishes).toEqual(["reverseHolofoil"]);
  });

  it("variant mismatch: selected finish has no data → No quote, never zero", () => {
    const v = buildReferenceView(refs, { ...raw, finish: "holofoil" }, opts);
    for (const b of v.blocks) {
      expect(b.status).toBe("none");
      expect(b.rows).toEqual([]);
      expect(b.reason).toMatch(/not for the selected finish/);
    }
  });

  it("unavailable price: missing source says so", () => {
    const v = buildReferenceView(refs.filter((r) => r.source === "tcgplayer"), raw, opts);
    const cm = v.blocks.find((b) => b.source === "cardmarket")!;
    expect(cm).toMatchObject({ status: "none", rows: [] });
    expect(cm.reason).toMatch(/did not supply/);
  });

  it("stale quote is flagged with a notice", () => {
    const v = buildReferenceView(refs, raw, { now: new Date("2026-10-20T00:00:00Z"), staleAfterDays: 7 });
    expect(v.blocks[0]!.rows.every((r) => r.stale)).toBe(true);
    expect(v.notices.join(" ")).toMatch(/older than 7 days/);
  });

  it("non-English language and graded cards get no quote with a reason", () => {
    const jp = buildReferenceView(refs, { ...raw, language: "Japanese" }, opts);
    expect(jp.blocks.every((b) => b.status === "none" && /English printings/.test(b.reason!))).toBe(true);
    const graded = buildReferenceView(refs, { ...raw, grading: "graded" }, opts);
    expect(graded.blocks.every((b) => b.status === "none" && /graded/.test(b.reason!))).toBe(true);
  });

  it("warns that references are not condition-specific", () => {
    const v = buildReferenceView(refs, { ...raw, condition: "Heavily Played" }, opts);
    expect(v.notices.join(" ")).toMatch(/not condition-specific/);
  });

  it("provider failure marks each source unavailable", () => {
    const v = buildReferenceView([], raw, { ...opts, unavailable: { tcgplayer: "down", cardmarket: "down" } });
    expect(v.blocks.map((b) => b.status)).toEqual(["unavailable", "unavailable"]);
  });

  it("isStale respects the threshold", () => {
    expect(isStale("2026-09-20T00:00:00Z", now, 7)).toBe(true);
    expect(isStale("2026-09-25T00:00:00Z", now, 7)).toBe(false);
  });
});

describe("mock catalog prices", () => {
  it("are flagged demo and carry no source links", async () => {
    const card = await new MockCatalog(() => now).getCard("mock:demo-a-25");
    expect(card!.prices.length).toBeGreaterThan(0);
    expect(card!.prices.every((p) => p.demo && p.sourceUrl === null)).toBe(true);
  });

  it("a card with no price blocks yields No quote for both sources", async () => {
    const card = await new MockCatalog(() => now).getCard("mock:demo-c-58");
    const v = buildReferenceView(card!.prices, raw, opts);
    expect(v.blocks.map((b) => b.status)).toEqual(["none", "none"]);
  });

  it("Charizard ex's Cardmarket fixture is stale", async () => {
    const card = await new MockCatalog(() => now).getCard("mock:demo-a-6");
    const v = buildReferenceView(card!.prices, { ...raw, finish: "holofoil" }, opts);
    expect(v.blocks.find((b) => b.source === "cardmarket")!.rows.every((r) => r.stale)).toBe(true);
    expect(v.blocks.find((b) => b.source === "tcgplayer")!.rows.some((r) => r.stale)).toBe(false);
  });
});
