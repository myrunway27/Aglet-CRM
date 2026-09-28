import { describe, expect, it } from "vitest";
import { MockCatalog } from "@/lib/catalog/mock";
import { parseClues } from "@/lib/match/parse";
import { rankCandidates, similarity } from "@/lib/match/score";

const now = new Date("2026-09-28T12:00:00Z");
const catalog = new MockCatalog(() => now);

async function match(text: string) {
  const clues = parseClues(text);
  return rankCandidates(await catalog.findByClues(clues), clues);
}

describe("rankCandidates", () => {
  it("uses the set code to disambiguate same-number, same-size sets", async () => {
    const r = await match("BASIC\nPikachu\nHP 60\nDSA 025/198");
    expect(r.candidates[0]?.card.catalogId).toBe("mock:demo-a-25");
    expect(r.candidates[1]?.card.catalogId).toBe("mock:demo-b-25");
    expect(r.confidence).toBe("high");
    expect(r.ambiguous).toBe(false);
    expect(r.candidates[0]?.reasons.join(" ")).toMatch(/Set code DSA/);
  });

  it("flags duplicate-artwork reprints as ambiguous without a set clue", async () => {
    const r = await match("Pikachu\n025/198");
    const ids = r.candidates.slice(0, 2).map((c) => c.card.catalogId).sort();
    expect(ids).toEqual(["mock:demo-a-25", "mock:demo-b-25"]);
    expect(r.ambiguous).toBe(true);
    expect(r.confidence).toBe("low");
  });

  it("prefers exact number + set size over a fuzzy title match", async () => {
    const r = await match("Pikachu\n058/102");
    expect(r.candidates[0]?.card.catalogId).toBe("mock:demo-c-58");
    expect(r.candidates[0]!.score).toBeGreaterThan(r.candidates[1]!.score);
  });

  it("recovers from a glare-damaged name and O/0 confusion", async () => {
    const r = await match("STAGE 2\nCharizrd ex\nHP 330\n0O6/198");
    expect(r.candidates[0]?.card.catalogId).toBe("mock:demo-a-6");
    expect(r.candidates[0]?.reasons.join(" ")).toMatch(/similar/);
  });

  it("returns no candidates for unrelated text", async () => {
    const r = await match("Weakness Resistance Retreat");
    expect(r.candidates).toEqual([]);
    expect(r.confidence).toBe("none");
  });

  it("caps the candidate list at 5", async () => {
    const base = (await catalog.getCard("mock:demo-a-25"))!;
    const many = Array.from({ length: 8 }, (_, i) => ({ ...base, catalogId: `mock:copy-${i}` }));
    const r = rankCandidates(many, parseClues("Pikachu\n025/198"));
    expect(r.candidates).toHaveLength(5);
  });

  it("never reports high confidence from a number alone", async () => {
    const r = await match("133/198");
    expect(r.candidates[0]?.card.catalogId).toBe("mock:demo-b-133");
    expect(r.confidence).not.toBe("high");
  });
});

describe("similarity", () => {
  it("is 1 for equal names ignoring accents and case", () => {
    expect(similarity("Pokémon", "POKEMON")).toBe(1);
  });
  it("is low for unrelated names", () => {
    expect(similarity("Pikachu", "Charizard")).toBeLessThan(0.3);
  });
});

describe("MockCatalog.search", () => {
  it("finds by name and narrows by number/total", async () => {
    expect((await catalog.search("pikachu")).length).toBe(3);
    expect((await catalog.search("pikachu 25/198")).map((c) => c.catalogId).sort()).toEqual([
      "mock:demo-a-25",
      "mock:demo-b-25",
    ]);
  });
  it("returns nothing for an empty/garbage query", async () => {
    expect(await catalog.search("<<>>")).toEqual([]);
  });
});
