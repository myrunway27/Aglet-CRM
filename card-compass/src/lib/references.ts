import "server-only";
import { getCatalog } from "./catalog";
import type { CatalogCardWithPrices } from "./catalog/types";
import { env } from "./env";
import { log } from "./log";
import { toReferences, type PriceReference } from "./prices";
import { loadStoredReferences, saveSnapshots } from "./repo";

/** Current references for a card, falling back to the last stored ones if the source fails. */
export async function referencesFor(
  catalogId: string,
  now = Date.now(),
): Promise<{ refs: PriceReference[]; data: CatalogCardWithPrices | null; fromStore: boolean }> {
  const staleAfterDays = env().PRICE_STALE_AFTER_DAYS;
  try {
    const data = await getCatalog().getCard(catalogId);
    const { references } = toReferences(data, { now, staleAfterDays });
    void saveSnapshots(data.card, references);
    return { refs: references, data, fromStore: false };
  } catch (err) {
    log.warn("references.source_failed", { name: err instanceof Error ? err.name : "unknown" });
    const stored = await loadStoredReferences(catalogId, now, staleAfterDays);
    return { refs: stored?.refs ?? [], data: null, fromStore: true };
  }
}

/** Run async tasks with limited concurrency (protects upstream rate limits). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}
