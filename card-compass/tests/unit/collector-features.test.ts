import { describe, expect, it, vi } from "vitest";
import { MockCatalogProvider, shiftFixtureDate } from "@/lib/catalog/mock";
import { PokemonTcgProvider } from "@/lib/catalog/pokemontcg";
import { compareNumbers } from "@/lib/catalog/types";
import { parseCollectionCsv } from "@/lib/collection-import";
import { csvCell, parseCsv, toCsv } from "@/lib/csv";
import type { FxRates } from "@/lib/fx/types";
import { computeMovers, toDailySeries, type SnapshotRow } from "@/lib/history";
import { itemPnl, totalPnl } from "@/lib/pnl";
import type { ItemValuation } from "@/lib/valuation";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const DAY = 86_400_000;
const fx: FxRates = { base: "EUR", date: "2026-09-26", rates: { USD: 1.1, GBP: 0.85, JPY: 160 }, source: "ECB", sourceUrl: null };
const val = (usd: number | null, eur: number | null): ItemValuation => ({
  bySource: {
    ...(usd !== null ? { tcgplayer: { unitMinor: usd, currency: "USD", subtype: "market", observedAt: "", stale: false } } : {}),
    ...(eur !== null ? { cardmarket: { unitMinor: eur, currency: "EUR", subtype: "trend", observedAt: "", stale: false } } : {}),
  },
  unpricedReason: null,
});

describe("profit/loss", () => {
  it("same currency: gain and percentage", () => {
    const p = itemPnl({ quantity: 2, purchasePriceMinor: 1000, purchaseCurrency: "USD", valuation: val(1500, null) }, "tcgplayer", null, NOW);
    expect(p).toMatchObject({ costMinor: 2000, valueMinor: 3000, gainMinor: 1000, gainPct: 0.5, converted: false });
  });
  it("converts the purchase price into the source currency with FX", () => {
    const p = itemPnl({ quantity: 1, purchasePriceMinor: 1100, purchaseCurrency: "USD", valuation: val(null, 900) }, "cardmarket", fx, NOW);
    expect(p).toMatchObject({ costMinor: 1000, valueMinor: 900, gainMinor: -100, converted: true });
  });
  it("unknown without purchase price, reference, or usable FX", () => {
    expect(itemPnl({ quantity: 1, purchasePriceMinor: null, purchaseCurrency: null, valuation: val(100, 100) }, "tcgplayer", fx, NOW)).toBeNull();
    expect(itemPnl({ quantity: 1, purchasePriceMinor: 100, purchaseCurrency: "USD", valuation: val(null, 100) }, "tcgplayer", fx, NOW)).toBeNull();
    expect(itemPnl({ quantity: 1, purchasePriceMinor: 100, purchaseCurrency: "USD", valuation: val(null, 100) }, "cardmarket", null, NOW)).toBeNull();
    expect(itemPnl({ quantity: 1, purchasePriceMinor: 100, purchaseCurrency: "USD", valuation: val(null, 100) }, "cardmarket", { ...fx, date: "2026-01-01" }, NOW)).toBeNull();
  });
  it("totals count only complete items", () => {
    const t = totalPnl(
      [
        { quantity: 1, purchasePriceMinor: 1000, purchaseCurrency: "USD", valuation: val(1200, null) },
        { quantity: 3, purchasePriceMinor: null, purchaseCurrency: null, valuation: val(500, null) },
      ],
      "tcgplayer",
      "USD",
      fx,
      NOW,
    );
    expect(t).toMatchObject({ costMinor: 1000, valueMinor: 1200, gainMinor: 200, itemsCounted: 1, itemsTotal: 4 });
  });
});

describe("CSV", () => {
  it("round-trips quotes, commas, newlines and a BOM", () => {
    const csv = toCsv([["a", "b,c", 'd "e"', "line1\nline2"]]);
    expect(parseCsv("﻿" + csv)).toEqual([["a", "b,c", 'd "e"', "line1\nline2"]]);
  });
  it("neutralizes formula injection on export", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5"); // numbers are safe
  });
  it("imports rows, applies defaults and reports errors by line", () => {
    const text = [
      "catalog_id,name,finish,language,grading,condition,grader,grade,quantity,purchase_price,purchase_currency,binder,extra",
      "fxa-25,Pikachu,reverseHolofoil,en,raw,LP,,,2,0.50,USD,Trade,x",
      "fxa-125,,holofoil,,graded,,PSA,10,1,,,,",
      ",bad,normal,,,,,,,,,,",
      "fxg-6,,normal,xx,,,,,,,,,",
      "fxg-6,,normal,,,,,,0,,,,",
      "fxg-6,,normal,,,,,,1,abc,USD,,",
      "fxg-6,,normal,,,,,,1,1.00,BTC,,",
      "fxg-6,,normal,,graded,,PSA,,1,,,,",
    ].join("\n");
    const { rows, errors } = parseCollectionCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ line: 2, catalogId: "fxa-25", quantity: 2, purchasePriceMinor: 50, purchaseCurrency: "USD", binder: "Trade", selection: { finish: "reverseHolofoil", condition: "LP" } });
    expect(rows[1].selection).toMatchObject({ grading: "graded", grader: "PSA", grade: "10" });
    expect(errors.map((e) => e.line)).toEqual([1, 4, 5, 6, 7, 8, 9]);
    expect(errors[0].message).toMatch(/unknown columns: extra/);
  });
  it("requires catalog_id and finish columns and caps size", () => {
    expect(parseCollectionCsv("name\nPikachu").errors[0].message).toMatch(/catalog_id/);
    expect(parseCollectionCsv("").errors[0].message).toMatch(/empty/);
    const big = "catalog_id,finish\n" + "fxa-25,normal\n".repeat(1001);
    expect(parseCollectionCsv(big).errors[0].message).toMatch(/Too many rows/);
  });
  it("accepts its own export format (formula guard undone)", () => {
    const exported = toCsv([["catalog_id", "finish", "binder"], ["fxa-25", "normal", "=Main"]]);
    expect(parseCollectionCsv(exported).rows[0].binder).toBe("=Main");
  });
});

describe("history + movers", () => {
  const row = (catalogId: string, daysAgo: number, amountMinor: number, extra: Partial<SnapshotRow> = {}): SnapshotRow => ({
    catalogId, name: catalogId, setName: "S", source: "tcgplayer", subtype: "market", finish: "normal", currency: "USD",
    amountMinor, observedAt: new Date(NOW - daysAgo * DAY), isDemo: false, ...extra,
  });
  it("builds one point per day, last observation wins", () => {
    const s = toDailySeries([
      { observedAt: new Date("2026-09-01T01:00:00Z"), amountMinor: 1 },
      { observedAt: new Date("2026-09-01T09:00:00Z"), amountMinor: 2 },
      { observedAt: new Date("2026-08-31T09:00:00Z"), amountMinor: 3 },
    ]);
    expect(s).toEqual([{ day: "2026-08-31", amountMinor: 3 }, { day: "2026-09-01", amountMinor: 2 }]);
  });
  it("computes change over the window and skips stale, short and penny series", () => {
    const rows = [
      row("up", 10, 1000), row("up", 7, 1000), row("up", 0, 1500),
      row("down", 8, 2000), row("down", 0, 1000),
      row("short", 3, 1000), row("short", 0, 2000), // not enough history
      row("stale", 20, 1000), row("stale", 10, 3000), // last point too old
      row("penny", 8, 5), row("penny", 0, 50), // under minMinor
    ];
    const m = computeMovers(rows, { windowDays: 7, now: NOW, minMinor: 100 });
    expect(m.map((x) => [x.catalogId, x.changePct])).toEqual([["up", 0.5], ["down", -0.5]]);
    expect(m[0]).toMatchObject({ fromMinor: 1000, toMinor: 1500 });
  });
  it("keeps sources/finishes separate", () => {
    const rows = [row("a", 7, 1000), row("a", 0, 1100), row("a", 7, 900, { source: "cardmarket", subtype: "trend", currency: "EUR" }), row("a", 0, 450, { source: "cardmarket", subtype: "trend", currency: "EUR" })];
    expect(computeMovers(rows, { windowDays: 7, now: NOW, minMinor: 100 })).toHaveLength(2);
  });
});

describe("catalog: sets and batch lookup", () => {
  it("sorts collector numbers naturally", () => {
    expect(["TG05", "125", "25", "2", "GG01"].sort(compareNumbers)).toEqual(["2", "25", "125", "GG01", "TG05"]);
  });
  it("mock lists a set and batch-looks-up ids", async () => {
    const c = new MockCatalogProvider(undefined, () => NOW);
    expect((await c.listSet("fxa")).map((x) => x.number)).toEqual(["25", "26", "125", "TG05"]);
    expect((await c.getCards(["fxa-25", "nope-1", "fxg-6"])).map((x) => x.catalogId).sort()).toEqual(["fxa-25", "fxg-6"]);
  });
  it("demo dates keep their age as the clock moves", () => {
    expect(shiftFixtureDate("2026/09/27", NOW)).toBe("2026/09/27");
    expect(shiftFixtureDate("2026/09/27", NOW + 10 * DAY)).toBe("2026/10/07");
  });

  const api = (fetchImpl: typeof fetch) =>
    new PokemonTcgProvider({ baseUrl: "https://api.example.test/v2", timeoutMs: 1000, perMinute: 100, perDay: 1000, catalogTtlSeconds: 60, priceTtlSeconds: 60, fetchImpl, sleep: async () => {} });
  const card = (id: string, number: string) => ({ id, name: "X", number, set: { id: "s1", name: "S", printedTotal: 300 } });

  it("pokemontcg getCards batches ids into OR queries of 50", async () => {
    const f = vi.fn(async (url: string) => {
      const q = new URL(url).searchParams.get("q")!;
      const ids = [...q.matchAll(/id:"([^"]+)"/g)].map((m) => m[1]);
      return Response.json({ data: ids.map((id) => card(id, id.split("-")[1])) });
    });
    const ids = Array.from({ length: 120 }, (_, i) => `s1-${i + 1}`);
    const out = await api(f as unknown as typeof fetch).getCards([...ids, "bad id!"]);
    expect(out).toHaveLength(120);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("pokemontcg listSet pages until done and sorts", async () => {
    const f = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      const data = page === 1 ? Array.from({ length: 250 }, (_, i) => card(`s1-${300 - i}`, String(300 - i))) : [card("s1-TG01", "TG01"), card("s1-1", "1")];
      return Response.json({ data, totalCount: 252 });
    });
    const out = await api(f as unknown as typeof fetch).listSet("s1");
    expect(out).toHaveLength(252);
    expect(out[0].number).toBe("1");
    expect(out[out.length - 1].number).toBe("TG01");
    expect(f).toHaveBeenCalledTimes(2);
  });
});
