import { describe, expect, it } from "vitest";
import { formatAsOf, formatMoney, toMinor } from "@/lib/price/format";

describe("currency formatting", () => {
  it("keeps the original currency code visible", () => {
    expect(formatMoney(1234, "USD")).toMatch(/USD\s?12\.34/);
    expect(formatMoney(1999, "EUR")).toMatch(/EUR\s?19\.99/);
    expect(formatMoney(1999, "EUR", "de-DE")).toMatch(/19,99\s?EUR/);
  });

  it("handles zero-decimal currencies", () => {
    expect(toMinor(500, "JPY")).toBe(500);
    expect(formatMoney(500, "JPY")).toMatch(/JPY\s?500/);
  });

  it("toMinor rounds and rejects zero, negative and non-numbers", () => {
    expect(toMinor(0.105, "USD")).toBe(11);
    expect(toMinor(12.3, "EUR")).toBe(1230);
    expect(toMinor(0, "USD")).toBeNull();
    expect(toMinor(-1, "USD")).toBeNull();
    expect(toMinor(null, "USD")).toBeNull();
    expect(toMinor("5", "USD")).toBeNull();
    expect(toMinor(Number.NaN, "USD")).toBeNull();
  });

  it("formats as-of dates in UTC", () => {
    expect(formatAsOf("2026-09-27T00:00:00.000Z")).toBe("Sep 27, 2026");
  });
});
