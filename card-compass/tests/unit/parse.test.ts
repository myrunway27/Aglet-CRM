import { describe, expect, it } from "vitest";
import { detectLanguage, normalizeNumber, parseClues, parseCollectorNumber } from "@/lib/match/parse";

describe("parseCollectorNumber", () => {
  it.each([
    ["025/198", "25", 198],
    ["25/198", "25", 198],
    ["  7 / 102 ", "7", 102],
    ["201/198", "201", 198], // secret rare above printed total
  ])("parses %s", (text, number, total) => {
    expect(parseCollectorNumber(text)).toMatchObject({ number, printedTotal: total });
  });

  it("keeps prefixed gallery numbers and has no numeric total", () => {
    expect(parseCollectorNumber("TG05/TG30")).toMatchObject({ number: "TG05", printedTotal: null });
    expect(parseCollectorNumber("GG01/GG70")).toMatchObject({ number: "GG01", printedTotal: null });
  });

  it("fixes common OCR digit confusions (O→0, l→1)", () => {
    expect(parseCollectorNumber("0O6/198")).toMatchObject({ number: "6", printedTotal: 198 });
    expect(parseCollectorNumber("l2/1O2")).toMatchObject({ number: "12", printedTotal: 102 });
  });

  it("parses promo numbers without a slash", () => {
    expect(parseCollectorNumber("SWSH 050")).toMatchObject({ number: "SWSH050", printedTotal: null });
  });

  it("returns null when there is no number", () => {
    expect(parseCollectorNumber("Pikachu HP 60")).toBeNull();
  });

  it("does not treat HP or dates as collector numbers", () => {
    expect(parseCollectorNumber("HP 60 Weakness x2")).toBeNull();
  });
});

describe("normalizeNumber", () => {
  it("strips leading zeros and case", () => {
    expect(normalizeNumber("025")).toBe("25");
    expect(normalizeNumber("tg05")).toBe("TG5");
    expect(normalizeNumber("TG5")).toBe("TG5");
  });
});

describe("parseClues", () => {
  it("skips card furniture and HP to find the name", () => {
    const c = parseClues("BASIC\nPikachu\nHP 60\nWeakness Resistance Retreat\nIllus. Someone\nDSA 025/198");
    expect(c.name).toBe("Pikachu");
    expect(c.number).toBe("25");
    expect(c.printedTotal).toBe(198);
    expect(c.setCodes).toContain("DSA");
    expect(c.setCodes).not.toContain("HP");
    expect(c.languageHint).toBe("English");
  });

  it("handles a name on the same line as HP", () => {
    expect(parseClues("Charizard ex HP 330\n006/198").name).toBe("Charizard ex");
  });

  it("returns empty clues for empty text", () => {
    const c = parseClues("");
    expect(c).toMatchObject({ name: null, number: null, printedTotal: null, setCodes: [] });
  });
});

describe("detectLanguage", () => {
  it.each([
    ["ピカチュウ", "Japanese"],
    ["피카츄", "Korean"],
    ["Faiblesse Résistance", "French"],
    ["Schwäche Resistenz Rückzug", "German"],
    ["Weakness Retreat", "English"],
    ["???", null],
  ])("%s → %s", (text, lang) => {
    expect(detectLanguage(text)).toBe(lang);
  });
});
