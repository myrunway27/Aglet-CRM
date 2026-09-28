import { describe, expect, it, vi } from "vitest";
import { convertMinor, fxUsable } from "@/lib/fx/convert";
import { EcbFxProvider, parseEcbXml } from "@/lib/fx/ecb";
import type { FxRates } from "@/lib/fx/types";
import { estimateLanded } from "@/lib/landed/landed";
import { formatMinor, parseMinor, toMinor } from "@/lib/money";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const fx: FxRates = { base: "EUR", date: "2026-09-26", rates: { USD: 1.1, GBP: 0.85, JPY: 160, AUD: 1.6, CAD: 1.5 }, source: "ECB", sourceUrl: null };
const base = { itemCurrency: "USD", shippingCurrency: "USD" };

describe("money with minor-unit exponents", () => {
  it("handles JPY (no minor unit)", () => {
    expect(toMinor(90, "JPY")).toBe(90);
    expect(parseMinor("12.5", "USD")).toBe(1250);
    expect(formatMinor(90, "JPY").replace(/\s/g, " ")).toBe("JPY 90");
  });
});

describe("FX", () => {
  it("parses ECB daily XML", () => {
    const xml = `<gesmes:Envelope><Cube><Cube time='2026-09-25'><Cube currency='USD' rate='1.1234'/><Cube currency='JPY' rate='161.5'/></Cube></Cube></gesmes:Envelope>`;
    expect(parseEcbXml(xml)).toMatchObject({ date: "2026-09-25", rates: { USD: 1.1234, JPY: 161.5 }, source: "ECB" });
    expect(() => parseEcbXml("<html/>")).toThrow();
  });

  it("converts via EUR cross rates and across exponents", () => {
    expect(convertMinor(1100, "USD", "EUR", fx)).toBe(1000);
    expect(convertMinor(1000, "EUR", "JPY", fx)).toBe(1600);
    expect(convertMinor(110, "USD", "GBP", fx)).toBe(85);
    expect(convertMinor(100, "USD", "CHF", fx)).toBeNull();
  });

  it("treats rates older than 5 days as unusable", () => {
    expect(fxUsable(fx, NOW)).toBe(true);
    expect(fxUsable({ ...fx, date: "2026-09-10" }, NOW)).toBe(false);
  });

  it("serves the last good rates if ECB fails", async () => {
    const xml = `<Cube time="2026-09-25"><Cube currency="USD" rate="1.1"/></Cube>`;
    let now = NOW;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const f = vi.fn().mockResolvedValueOnce(new Response(xml)).mockRejectedValue(new TypeError("down"));
    const p = new EcbFxProvider(1000, f as unknown as typeof fetch);
    await p.getRates();
    now += 7 * 3_600_000; // past the 6h TTL
    await expect(p.getRates()).resolves.toMatchObject({ date: "2026-09-25" });
    expect(f).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});

describe("estimateLanded", () => {
  it("domestic US: item + shipping, sales tax caveat", () => {
    const r = estimateLanded({ ...base, itemMinor: 99, shippingMinor: 100, itemCountry: "US", buyerCountry: "US", buyerCurrency: "USD" }, fx, NOW);
    expect(r).toMatchObject({ status: "known", totalMinor: 199, ruleId: "domestic" });
    expect(r.caveats.join(" ")).toMatch(/Sales tax/);
  });

  it("intra-EU is domestic (no import charges)", () => {
    const r = estimateLanded(
      { itemMinor: 60, itemCurrency: "EUR", shippingMinor: 250, shippingCurrency: "EUR", itemCountry: "DE", buyerCountry: "FR", buyerCurrency: "EUR" },
      fx,
      NOW,
    );
    expect(r).toMatchObject({ status: "known", totalMinor: 310, ruleId: "domestic" });
  });

  it("US -> Germany under €150: VAT 19% on item+shipping plus €3 flat duty", () => {
    const r = estimateLanded({ ...base, itemMinor: 1100, shippingMinor: 550, itemCountry: "US", buyerCountry: "DE", buyerCurrency: "EUR" }, fx, NOW);
    // item 10.00 EUR + ship 5.00 EUR = 15.00; VAT 2.85; duty 3.00
    expect(r.status).toBe("known");
    expect(r.lines.map((l) => [l.label, l.amountMinor])).toEqual([
      ["Item", 1000],
      ["Shipping", 500],
      ["Import VAT (19%)", 285],
      ["Customs duty (flat)", 300],
    ]);
    expect(r.totalMinor).toBe(2085);
  });

  it("US -> UK under £135: 20% VAT, no duty", () => {
    const r = estimateLanded({ ...base, itemMinor: 1100, shippingMinor: 0, itemCountry: "US", buyerCountry: "GB", buyerCurrency: "GBP" }, fx, NOW);
    expect(r.totalMinor).toBe(850 + 170);
  });

  it("above the low-value threshold: total unknown", () => {
    const r = estimateLanded({ ...base, itemMinor: 30000, shippingMinor: 1000, itemCountry: "US", buyerCountry: "DE", buyerCurrency: "EUR" }, fx, NOW);
    expect(r.status).toBe("unknown");
    expect(r.totalMinor).toBeNull();
    expect(r.missing[0]).toMatch(/threshold/);
  });

  it("unmodeled destination (imports into the US): total unknown", () => {
    const r = estimateLanded({ ...base, itemMinor: 50, shippingMinor: 300, itemCountry: "JP", buyerCountry: "US", buyerCurrency: "USD" }, fx, NOW);
    expect(r.status).toBe("unknown");
    expect(r.missing[0]).toMatch(/not modeled/);
  });

  it("missing shipping, location or FX: total unknown with reasons", () => {
    const r = estimateLanded({ ...base, itemMinor: 50, shippingMinor: null, itemCountry: null, buyerCountry: "US", buyerCurrency: "USD" }, { ...fx, date: "2026-01-01" }, NOW);
    expect(r.status).toBe("unknown");
    expect(r.missing).toEqual(["Shipping to US not quoted", "Item location not stated", "No current exchange rate"]);
  });
});
