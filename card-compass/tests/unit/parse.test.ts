import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCardText } from "@/lib/matching/parse";

const fixture = (n: string) => readFileSync(path.join(__dirname, "../../fixtures/ocr", `${n}.txt`), "utf8");

describe("parseCardText: collector numbers", () => {
  it.each([
    ["025/198", "25", 198, "025/198"],
    ["Illus. X  4/102 ", "4", 102, "4/102"],
    ["TG05/TG30", "TG05", null, "TG05/TG30"],
    ["GG01 / GG70", "GG01", null, "GG01/GG70"],
    ["151 ⁄ 165", "151", 165, "151/165"],
    ["O25/1O8", "25", 108, "025/108"],
  ])("parses %s", (text, number, total, raw) => {
    const p = parseCardText(text);
    expect(p.number).toBe(number);
    expect(p.setTotal).toBe(total);
    expect(p.rawNumber).toBe(raw);
  });

  it("notes when misread letters were corrected", () => {
    expect(parseCardText("O25/1O8").notes.join(" ")).toMatch(/corrected/);
  });

  it("does not treat letter-only fractions or dates as numbers", () => {
    expect(parseCardText("IO/OI").number).toBeNull();
    expect(parseCardText("2026/09/27").number).toBeNull();
  });

  it("recognizes promo numbers without a set total", () => {
    const p = parseCardText("Pikachu HP 60\nSWSH050");
    expect(p.number).toBe("SWSH050");
    expect(p.setTotal).toBeNull();
  });
});

describe("parseCardText: names", () => {
  it("reads name and HP from an English card", () => {
    const p = parseCardText(fixture("pikachu-alpha"));
    expect(p).toMatchObject({ name: "Pikachu", hp: 60, number: "25", setTotal: 198 });
  });

  it("reads a French card (PV) and strips the stage label", () => {
    const p = parseCardText(fixture("pikachu-beta-fr-rotated"));
    expect(p).toMatchObject({ name: "Pikachu", hp: 60, number: "25", setTotal: 108 });
  });

  it("handles a stage prefix on the same line", () => {
    expect(parseCardText("STAGE 1 Raichu HP 120").name).toBe("Raichu");
    expect(parseCardText("Stufe 1\nRaichu 120 KP").name).toBe("Raichu");
  });

  it("returns nothing for unreadable text", () => {
    const p = parseCardText(fixture("unreadable"));
    expect(p.name).toBeNull();
    expect(p.number).toBeNull();
    expect(p.notes).toContain("No card name or collector number could be read.");
  });

  it("keeps non-Latin names when present", () => {
    expect(parseCardText("ピカチュウ HP 60\n025/198").name).toBe("ピカチュウ");
  });
});
