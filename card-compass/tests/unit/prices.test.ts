import { describe, expect, it } from "vitest";
import { MockCatalogProvider } from "@/lib/catalog/mock";
import { formatMinor, toMinor } from "@/lib/money";
import { groupByFinish, isStale, parseSourceDate, toReferences } from "@/lib/prices";
import { safeImageUrl, safeSourceUrl } from "@/lib/safe-url";

const catalog = new MockCatalogProvider();
const NOW = Date.parse("2026-09-28T12:00:00Z");
const opts = { now: NOW, staleAfterDays: 7 };

describe("currency formatting", () => {
  it("formats minor units in the original currency with an explicit code", () => {
    expect(formatMinor(2250, "USD").replace(/\s/g, " ")).toBe("USD 22.50");
    expect(formatMinor(1990, "EUR").replace(/\s/g, " ")).toBe("EUR 19.90");
    expect(formatMinor(5, "EUR").replace(/\s/g, " ")).toBe("EUR 0.05");
  });
  it("treats missing, zero and negative values as no quote", () => {
    expect(toMinor(undefined)).toBeNull();
    expect(toMinor(null)).toBeNull();
    expect(toMinor(0)).toBeNull();
    expect(toMinor(-1)).toBeNull();
    expect(toMinor(Number.NaN)).toBeNull();
    expect(toMinor(0.195)).toBe(20);
  });
});

describe("toReferences", () => {
  it("tags every reference with source, currency, subtype, finish and dates", async () => {
    const { references, sources } = toReferences(await catalog.getCard("fxa-25"), opts);
    const market = references.find((r) => r.source === "tcgplayer" && r.finish === "normal" && r.subtype === "market");
    expect(market).toMatchObject({ currency: "USD", amountMinor: 21, observedAt: "2026-09-27T00:00:00.000Z", isDemo: true, stale: false });
    const cmRev = references.find((r) => r.source === "cardmarket" && r.finish === "reverseHolofoil" && r.subtype === "trend");
    expect(cmRev).toMatchObject({ currency: "EUR", amountMinor: 50 });
    expect(sources.map((s) => s.status)).toEqual(["ok", "ok"]);
  });

  it("reports an unavailable source as no-quote instead of zero", async () => {
    const { references, sources } = toReferences(await catalog.getCard("fxg-58"), opts);
    expect(references.every((r) => r.source === "tcgplayer")).toBe(true);
    expect(sources.find((s) => s.source === "cardmarket")).toMatchObject({ status: "no-quote", observedAt: null });
  });

  it("drops zero and null fields", async () => {
    const { references } = toReferences(await catalog.getCard("fxg-151"), opts);
    const cm = references.filter((r) => r.source === "cardmarket");
    expect(cm.map((r) => r.subtype)).toEqual(["trend"]);
  });

  it("returns no references at all for a card without price blocks", async () => {
    const { references, sources } = toReferences(await catalog.getCard("fxg-6"), opts);
    expect(references).toEqual([]);
    expect(sources.every((s) => s.status === "no-quote")).toBe(true);
  });

  it("marks old quotes as stale", async () => {
    const { references, sources } = toReferences(await catalog.getCard("fxb-4"), opts);
    expect(references.every((r) => r.stale)).toBe(true);
    expect(sources.every((s) => s.stale)).toBe(true);
    expect(isStale("2026-09-27T00:00:00Z", NOW, 7)).toBe(false);
  });

  it("ignores undated price blocks rather than guessing a date", () => {
    const { references } = toReferences(
      { card: {} as never, isDemo: false, cardmarket: null, tcgplayer: { prices: { normal: { market: 1 } } } },
      opts,
    );
    expect(references).toEqual([]);
    expect(parseSourceDate("garbage")).toBeNull();
  });

  it("drops non-allow-listed source links", () => {
    const { references } = toReferences(
      {
        card: {} as never,
        isDemo: false,
        cardmarket: null,
        tcgplayer: { url: "https://evil.example/redirect?to=x", updatedAt: "2026/09/27", prices: { normal: { market: 1 } } },
      },
      opts,
    );
    expect(references[0].sourceCardUrl).toBeNull();
  });
});

describe("groupByFinish (variant mismatch)", () => {
  it("never substitutes another finish's price for the confirmed finish", async () => {
    // Charizard ex only has holofoil prices; the buyer confirmed reverse holo.
    const { references } = toReferences(await catalog.getCard("fxa-125"), opts);
    const tcg = groupByFinish(references.filter((r) => r.source === "tcgplayer"), "reverseHolofoil");
    expect(tcg.exact).toEqual([]);
    expect(tcg.otherFinishes.map((r) => r.finish)).toContain("holofoil");
    const cm = groupByFinish(references.filter((r) => r.source === "cardmarket"), "reverseHolofoil");
    expect(cm.exact).toEqual([]);
    expect(cm.notFinishSpecific.length).toBeGreaterThan(0);
  });
});

describe("safe URLs", () => {
  it.each([
    ["https://prices.pokemontcg.io/tcgplayer/sv1-25", true],
    ["https://www.cardmarket.com/en/Pokemon/Products/Singles/x", true],
    ["http://prices.pokemontcg.io/tcgplayer/sv1-25", false],
    ["javascript:alert(1)", false],
    ["https://prices.pokemontcg.io.evil.com/x", false],
    ["https://user:pw@www.tcgplayer.com/x", false],
  ])("%s -> allowed=%s", (url, ok) => {
    expect(Boolean(safeSourceUrl(url))).toBe(ok);
  });
  it("only allows catalog image host", () => {
    expect(safeImageUrl("https://images.pokemontcg.io/sv1/25.png")).toBeTruthy();
    expect(safeImageUrl("https://example.com/x.png")).toBeNull();
  });
});
