import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MockCatalogProvider } from "@/lib/catalog/mock";
import { findCandidates, MAX_CANDIDATES, rankCandidates } from "@/lib/matching/match";
import { parseCardText } from "@/lib/matching/parse";

const catalog = new MockCatalogProvider(undefined, () => Date.parse("2026-09-28T12:00:00Z"));
const fixture = (n: string) => readFileSync(path.join(__dirname, "../../fixtures/ocr", `${n}.txt`), "utf8");

describe("findCandidates", () => {
  it("ranks the exact number + set total + name first, with high confidence", async () => {
    const r = await findCandidates(parseCardText(fixture("pikachu-alpha")), catalog);
    expect(r.candidates[0].card.catalogId).toBe("fxa-25");
    expect(r.candidates[0].confidence).toBe("high");
    expect(r.candidates[0].reasons).toEqual(
      expect.arrayContaining(["Collector number 25 matches", "Name matches"]),
    );
    expect(r.ambiguous).toBe(false);
  });

  it("disambiguates the same name + number across sets by printed total", async () => {
    const r = await findCandidates(parseCardText(fixture("pikachu-beta-fr-rotated")), catalog);
    expect(r.candidates[0].card.catalogId).toBe("fxb-25");
    const alpha = r.candidates.find((c) => c.card.catalogId === "fxa-25");
    expect(alpha).toBeDefined();
    expect(alpha!.score).toBeLessThan(r.candidates[0].score);
    expect(r.duplicatePrintings).toBe(true);
  });

  it("flags an ambiguous scan (name only, several printings) and never exceeds 5 candidates", async () => {
    const r = await findCandidates(parseCardText(fixture("charizard-glare")), catalog);
    expect(r.candidates.length).toBeGreaterThan(1);
    expect(r.candidates.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    expect(r.ambiguous).toBe(true);
    expect(r.candidates.every((c) => c.confidence !== "high")).toBe(true);
  });

  it("returns no match for an unknown card", async () => {
    const r = await findCandidates(parseCardText("Missingno HP 10\n999/999"), catalog);
    expect(r.candidates).toEqual([]);
  });

  it("caps candidates at 5 for broad matches", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      catalogId: `x-${i}`,
      name: "Pikachu",
      number: String(i),
      setId: "x",
      setName: "X",
      setSeries: null,
      setPrintedTotal: 100,
      setPtcgoCode: null,
      releaseDate: null,
      rarity: null,
      imageSmall: null,
      imageLarge: null,
      finishes: [],
    }));
    const r = rankCandidates(many, parseCardText("Pikachu HP 60"));
    expect(r.candidates).toHaveLength(5);
  });

  it("penalizes a name that clearly differs even if the number matches", async () => {
    const r = await findCandidates(parseCardText("Mew HP 60\n025/198"), catalog);
    const pika = r.candidates.find((c) => c.card.catalogId === "fxa-25");
    expect(pika?.confidence).not.toBe("high");
    expect(pika?.reasons.join(" ")).toMatch(/Name differs/);
  });
});
