import "server-only";
import { env } from "../server/env";
import { MockCatalog } from "./mock";
import { PokemonTcgCatalog } from "./pokemontcg";
import type { CatalogProvider } from "./provider";

let instance: CatalogProvider | undefined;

export function catalog(): CatalogProvider {
  if (!instance) {
    const e = env();
    instance =
      e.CATALOG_PROVIDER === "pokemontcg"
        ? new PokemonTcgCatalog({
            baseUrl: e.POKEMONTCG_BASE_URL,
            apiKey: e.POKEMONTCG_API_KEY,
            timeoutMs: e.OUTBOUND_TIMEOUT_MS,
            perMinute: e.POKEMONTCG_LIMIT_PER_MINUTE,
            perDay: e.POKEMONTCG_API_KEY ? e.POKEMONTCG_LIMIT_PER_DAY_KEYED : e.POKEMONTCG_LIMIT_PER_DAY_KEYLESS,
            catalogTtlMs: e.CATALOG_CACHE_TTL_SECONDS * 1000,
            priceTtlMs: e.PRICE_CACHE_TTL_SECONDS * 1000,
          })
        : new MockCatalog();
  }
  return instance;
}
