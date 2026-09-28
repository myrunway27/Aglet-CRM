import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { MockCatalogProvider } from "@/lib/catalog/mock";
import { toReferences } from "@/lib/prices";
import { shouldTrigger, totalCollection, valueItem } from "@/lib/valuation";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const catalog = new MockCatalogProvider(undefined, () => Date.parse("2026-09-28T12:00:00Z"));
const refs = async (id: string) => toReferences(await catalog.getCard(id), { now: NOW, staleAfterDays: 7 }).references;

describe("valueItem / totalCollection", () => {
  it("uses like-for-like references per source", async () => {
    const v = valueItem({ finish: "reverseHolofoil", language: "en", grading: "raw", quantity: 1 }, await refs("fxa-25"));
    expect(v.bySource.tcgplayer).toMatchObject({ unitMinor: 55, currency: "USD", subtype: "market" });
    expect(v.bySource.cardmarket).toMatchObject({ unitMinor: 50, currency: "EUR", subtype: "trend" });
  });
  it("leaves graded, non-English and unpriced finishes without value", async () => {
    const r = await refs("fxa-25");
    expect(valueItem({ finish: "normal", language: "en", grading: "graded", quantity: 1 }, r).unpricedReason).toMatch(/Graded/);
    expect(valueItem({ finish: "normal", language: "ja", grading: "raw", quantity: 1 }, r).unpricedReason).toMatch(/English/);
    expect(valueItem({ finish: "holofoil", language: "en", grading: "raw", quantity: 1 }, await refs("fxg-6")).unpricedReason).toMatch(/No matching/);
  });
  it("sums per source without mixing currencies, counting quantities", async () => {
    const a = valueItem({ finish: "reverseHolofoil", language: "en", grading: "raw", quantity: 3 }, await refs("fxa-25"));
    const b = valueItem({ finish: "normal", language: "en", grading: "raw", quantity: 1 }, await refs("fxg-58")); // TCGplayer only
    const t = totalCollection([{ quantity: 3, valuation: a }, { quantity: 1, valuation: b }]);
    expect(t).toEqual([
      { source: "tcgplayer", currency: "USD", amountMinor: 55 * 3 + 33, itemsPriced: 4, itemsTotal: 4 },
      { source: "cardmarket", currency: "EUR", amountMinor: 150, itemsPriced: 3, itemsTotal: 4 },
    ]);
  });
});

describe("shouldTrigger", () => {
  const base = { direction: "below" as const, threshold: 500, lastTriggeredAt: null, now: NOW };
  it("fires on a crossing", () => expect(shouldTrigger({ ...base, value: 480, previous: 520 })).toBe(true));
  it("fires on the first check if already past the line", () => expect(shouldTrigger({ ...base, value: 480, previous: null })).toBe(true));
  it("does not re-fire while it stays past the line", () => expect(shouldTrigger({ ...base, value: 470, previous: 480 })).toBe(false));
  it("does not fire if not past the line", () => expect(shouldTrigger({ ...base, value: 520, previous: 530 })).toBe(false));
  it("respects the cooldown", () =>
    expect(shouldTrigger({ ...base, value: 480, previous: 520, lastTriggeredAt: new Date(NOW - 3_600_000) })).toBe(false));
  it("works for 'above'", () => expect(shouldTrigger({ ...base, direction: "above", value: 520, previous: 480 })).toBe(true));
});

describe("passwords", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(h).not.toContain("correct");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong password!!", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});
