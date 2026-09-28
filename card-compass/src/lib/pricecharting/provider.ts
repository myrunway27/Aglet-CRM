import fixture from "../../../fixtures/pricecharting/products.json";
import { TtlCache } from "../cache";
import type { CatalogCard } from "../catalog/types";
import { fetchJsonWithRetry, type FetchLike } from "../http";
import { normalizeName } from "../matching/normalize";
import { OutboundLimiter } from "../rate-limit";
import type { PcProduct } from "./match";

export interface PcProvider {
  readonly id: "mock" | "live";
  /** Candidate products for a card (name + number search). */
  search(card: CatalogCard): Promise<PcProduct[]>;
}

type RawProduct = Record<string, string | number | null | undefined>;
const toProduct = (r: RawProduct): PcProduct => ({
  id: String(r.id),
  productName: String(r["product-name"] ?? ""),
  consoleName: String(r["console-name"] ?? ""),
  prices: Object.fromEntries(Object.entries(r).filter(([k, v]) => k.endsWith("-price") && typeof v === "number")) as Record<string, number>,
});

export class MockPcProvider implements PcProvider {
  readonly id = "mock" as const;
  async search(card: CatalogCard): Promise<PcProduct[]> {
    const name = normalizeName(card.name);
    return (fixture as { products: RawProduct[] }).products
      .map(toProduct)
      .filter((p) => normalizeName(p.productName).startsWith(name));
  }
}

/**
 * PriceCharting API (paid subscription). Prices are based on completed sales.
 * The token is a query parameter by PriceCharting's design, so request URLs
 * are never logged.
 */
export class LivePcProvider implements PcProvider {
  readonly id = "live" as const;
  private limiter: OutboundLimiter;
  private cache = new TtlCache<PcProduct[]>(24 * 3_600_000, 7 * 86_400_000);

  constructor(
    private readonly token: string,
    perMinute: number,
    perDay: number,
    private readonly fetchImpl?: FetchLike,
  ) {
    this.limiter = new OutboundLimiter(perMinute, perDay);
  }

  async search(card: CatalogCard): Promise<PcProduct[]> {
    const q = `${card.name} ${card.number} ${card.setName}`.replace(/[^\p{L}\p{N} #'-]/gu, " ").slice(0, 100);
    const hit = this.cache.get(q);
    if (hit?.fresh) return hit.value;
    this.limiter.acquire();
    const url = new URL("https://www.pricecharting.com/api/products");
    url.searchParams.set("t", this.token);
    url.searchParams.set("q", q);
    try {
      const res = await fetchJsonWithRetry<{ status?: string; products?: RawProduct[] }>(
        url.toString(),
        { headers: { Accept: "application/json" } },
        { timeoutMs: 8000, retries: 2, fetchImpl: this.fetchImpl },
      );
      const products = (res.products ?? []).map(toProduct);
      this.cache.set(q, products);
      return products;
    } catch (err) {
      if (hit) return hit.value;
      throw err;
    }
  }
}
