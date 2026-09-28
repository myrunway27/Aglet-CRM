import { describe, expect, it, vi } from "vitest";
import { MockCatalogProvider } from "@/lib/catalog/mock";
import { matchProduct, parseProductName, productToReferences, subtypeForGrade } from "@/lib/pricecharting/match";
import { LivePcProvider, MockPcProvider } from "@/lib/pricecharting/provider";
import { valueItem } from "@/lib/valuation";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const catalog = new MockCatalogProvider(undefined, () => NOW);
const pc = new MockPcProvider();

describe("PriceCharting matching", () => {
  it("parses product names", () => {
    expect(parseProductName("Pikachu [Reverse Holo] #25")).toEqual({ name: "Pikachu", variant: "Reverse Holo", number: "25" });
    expect(parseProductName("Charizard ex #125")).toEqual({ name: "Charizard ex", variant: null, number: "125" });
  });

  it("matches the exact printing by name, number, set and variant", async () => {
    const { card } = await catalog.getCard("fxa-25");
    const products = await pc.search(card);
    expect(matchProduct(products, card, "normal").product?.id).toBe("demo-pc-1");
    expect(matchProduct(products, card, "reverseHolofoil").product?.id).toBe("demo-pc-2");
    const beta = (await catalog.getCard("fxb-25")).card;
    expect(matchProduct(await pc.search(beta), beta, "holofoil").product?.id).toBe("demo-pc-3");
  });

  it("ignores stamped/other variants and Charizard vs Charizard ex", async () => {
    const cz = (await catalog.getCard("fxa-125")).card;
    expect(matchProduct(await pc.search(cz), cz, "holofoil").product?.id).toBe("demo-pc-4");
    const plain = (await catalog.getCard("fxb-4")).card;
    expect(matchProduct(await pc.search(plain), plain, "holofoil").product?.id).toBe("demo-pc-6");
  });

  it("refuses to guess when several products fit, or none do", async () => {
    const { card } = await catalog.getCard("fxa-25");
    const products = await pc.search(card);
    const dup = [...products, { ...products[0], id: "dup" }];
    expect(matchProduct(dup, card, "normal")).toMatchObject({ product: null, note: expect.stringMatching(/not guessing/) });
    const eevee = (await catalog.getCard("fxg-133")).card;
    expect(matchProduct(await pc.search(eevee), eevee, "normal").product).toBeNull();
  });

  it("maps pennies into per-grade references", () => {
    const refs = productToReferences(
      { id: "x", productName: "P #1", consoleName: "S", prices: { "loose-price": 25, "manual-only-price": 4500, "graded-price": 0 } },
      "normal",
      NOW,
      false,
    );
    expect(refs.map((r) => [r.subtype, r.amountMinor, r.source, r.currency])).toEqual([
      ["ungraded", 25, "pricecharting", "USD"],
      ["psa10", 4500, "pricecharting", "USD"],
    ]);
  });

  it("maps grades to PriceCharting subtypes", () => {
    expect(subtypeForGrade("PSA", "10")).toBe("psa10");
    expect(subtypeForGrade("BGS", "10")).toBe("bgs10");
    expect(subtypeForGrade("Other", "10")).toBeNull();
    expect(subtypeForGrade("CGC", "9.5")).toBe("grade9_5");
    expect(subtypeForGrade("PSA", "8.5")).toBe("grade8");
    expect(subtypeForGrade("PSA", "6")).toBeNull();
  });

  it("values graded items at their exact grade and raw items at ungraded", async () => {
    const { card } = await catalog.getCard("fxa-125");
    const m = matchProduct(await pc.search(card), card, "holofoil");
    const refs = productToReferences(m.product!, "holofoil", NOW, true);
    const psa10 = valueItem({ finish: "holofoil", language: "en", grading: "graded", grader: "PSA", grade: "10", quantity: 1 }, refs);
    expect(psa10.bySource).toEqual({ pricecharting: expect.objectContaining({ unitMinor: 13800, subtype: "psa10" }) });
    const raw = valueItem({ finish: "holofoil", language: "en", grading: "raw", quantity: 1 }, refs);
    expect(raw.bySource.pricecharting).toMatchObject({ unitMinor: 2350, subtype: "ungraded" });
  });

  it("live provider queries by name/number/set and caches", async () => {
    const f = vi.fn(async () => Response.json({ status: "success", products: [{ id: 1, "product-name": "Pikachu #25", "console-name": "Pokemon X", "loose-price": 30 }] }));
    const p = new LivePcProvider("tok", 10, 100, f as unknown as typeof fetch);
    const { card } = await catalog.getCard("fxa-25");
    const out = await p.search(card);
    await p.search(card);
    expect(f).toHaveBeenCalledTimes(1);
    expect(out[0]).toMatchObject({ id: "1", productName: "Pikachu #25", prices: { "loose-price": 30 } });
    expect(new URL((f.mock.calls[0] as unknown as [string])[0]).searchParams.get("q")).toBe("Pikachu 25 Fixture Set Alpha");
  });
});
