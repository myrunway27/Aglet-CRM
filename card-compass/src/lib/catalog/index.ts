import "server-only";
import { env } from "../env";
import { MockCatalogProvider } from "./mock";
import { PokemonTcgProvider } from "./pokemontcg";
import type { CatalogProvider } from "./types";

let provider: CatalogProvider | undefined;

/** Singleton per server instance so caches and rate limiters are shared. */
export function getCatalog(): CatalogProvider {
  if (provider) return provider;
  const e = env();
  provider =
    e.CATALOG_PROVIDER === "pokemontcg"
      ? new PokemonTcgProvider({
          baseUrl: e.POKEMONTCG_BASE_URL,
          apiKey: e.POKEMONTCG_API_KEY,
          timeoutMs: e.POKEMONTCG_TIMEOUT_MS,
          perMinute: e.POKEMONTCG_LIMIT_PER_MINUTE,
          perDay: e.POKEMONTCG_LIMIT_PER_DAY,
          catalogTtlSeconds: e.CATALOG_CACHE_TTL_SECONDS,
          priceTtlSeconds: e.PRICE_CACHE_TTL_SECONDS,
        })
      : new MockCatalogProvider();
  return provider;
}
