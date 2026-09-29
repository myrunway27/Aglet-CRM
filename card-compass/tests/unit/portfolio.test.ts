import { describe, expect, it } from "vitest";
import { buildPortfolio, change, dayRange, seriesKeyFor, speciesOf, type Holding } from "@/lib/portfolio";
import { subtypeForGrade } from "@/lib/pricecharting/match";

const h = (id: string, catalogId: string, quantity: number, seriesKey: string | null): Holding => ({
  id, catalogId, name: id, setName: "S", number: "1", finish: "normal", quantity, seriesKey,
});

describe("portfolio", () => {
  const days = dayRange("2026-09-10", 5); // 06..10
  it("builds day ranges", () => {
    expect(days).toEqual(["2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"]);
  });

  it("sums holdings by day, carries prices forward, never backfills", () => {
    const series = new Map([
      ["a|tcgplayer|normal|market", [{ day: "2026-09-06", amountMinor: 100 }, { day: "2026-09-09", amountMinor: 150 }]],
      ["b|tcgplayer|normal|market", [{ day: "2026-09-08", amountMinor: 1000 }]],
    ]);
    const { points, movers } = buildPortfolio(
      [h("A", "a", 2, "tcgplayer|normal|market"), h("B", "b", 1, "tcgplayer|normal|market"), h("C", "c", 1, null)],
      series,
      days,
    );
    expect(points.map((p) => [p.valueMinor, p.cardsPriced])).toEqual([[200, 2], [200, 2], [1200, 3], [1300, 3], [1300, 3]]);
    // B has no price on the first day, so it is not a mover over this window
    expect(movers.map((m) => [m.holdingId, m.fromMinor, m.toMinor])).toEqual([["A", 200, 300]]);
    expect(movers[0].changePct).toBeCloseTo(0.5);
    expect(change(points, 1)).toEqual({ minor: 0, pct: 0 });
    expect(change(points, 4)).toEqual({ minor: 1100, pct: 5.5 });
    expect(change(points, 10)).toBeNull();
  });

  it("picks the same series the valuation uses", () => {
    const raw = { finish: "reverseHolofoil", language: "en", grading: "raw" };
    expect(seriesKeyFor("tcgplayer", raw, subtypeForGrade)).toBe("tcgplayer|reverseHolofoil|market");
    expect(seriesKeyFor("cardmarket", raw, subtypeForGrade)).toBe("cardmarket|reverseHolofoil|trend");
    expect(seriesKeyFor("cardmarket", { ...raw, finish: "holofoil" }, subtypeForGrade)).toBe("cardmarket|unspecified|trend");
    const graded = { finish: "holofoil", language: "en", grading: "graded", grader: "PSA", grade: "10" };
    expect(seriesKeyFor("pricecharting", graded, subtypeForGrade)).toBe("pricecharting|holofoil|psa10");
    expect(seriesKeyFor("tcgplayer", graded, subtypeForGrade)).toBeNull();
    expect(seriesKeyFor("tcgplayer", { ...raw, language: "ja" }, subtypeForGrade)).toBeNull();
  });

  it("groups names by species", () => {
    expect(speciesOf("Charizard ex")).toBe("Charizard");
    expect(speciesOf("Pikachu VMAX")).toBe("Pikachu");
    expect(speciesOf("Radiant Charizard")).toBe("Charizard");
    expect(speciesOf("Mr. Mime")).toBe("Mr. Mime");
  });
});
