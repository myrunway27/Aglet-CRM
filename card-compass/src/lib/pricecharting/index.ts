import "server-only";
import { TtlCache } from "../cache";
import type { CatalogCard } from "../catalog/types";
import { env } from "../env";
import { log } from "../log";
import type { PriceReference } from "../prices";
import { matchProduct, productToReferences } from "./match";
import { LivePcProvider, MockPcProvider, type PcProvider } from "./provider";

let provider: PcProvider | null | undefined;
export function getPcProvider(): PcProvider | null {
  if (provider !== undefined) return provider;
  const e = env();
  provider =
    e.PRICECHARTING_PROVIDER === "live" && e.PRICECHARTING_TOKEN
      ? new LivePcProvider(e.PRICECHARTING_TOKEN, e.PRICECHARTING_LIMIT_PER_MINUTE, e.PRICECHARTING_LIMIT_PER_DAY)
      : e.PRICECHARTING_PROVIDER === "mock"
        ? new MockPcProvider()
        : null;
  return provider;
}

export interface PcResult {
  status: "ok" | "no-match" | "unavailable" | "disabled";
  note: string;
  refs: PriceReference[];
}

const results = new TtlCache<PcResult>(12 * 3_600_000, 0);

/** Sales-based PriceCharting references (ungraded + per grade) for one printing. */
export async function pricechartingRefs(card: CatalogCard, finish: string, now = Date.now()): Promise<PcResult> {
  const p = getPcProvider();
  if (!p) return { status: "disabled", note: "PriceCharting is not enabled", refs: [] };
  const key = `${card.catalogId}|${finish}`;
  const hit = results.get(key);
  if (hit?.fresh) return hit.value;
  try {
    const m = matchProduct(await p.search(card), card, finish);
    const r: PcResult = m.product
      ? { status: "ok", note: m.note, refs: productToReferences(m.product, finish, now, p.id === "mock") }
      : { status: "no-match", note: m.note, refs: [] };
    results.set(key, r);
    return r;
  } catch (err) {
    log.warn("pricecharting.failed", { name: err instanceof Error ? err.name : "unknown" });
    return { status: "unavailable", note: "PriceCharting is unavailable right now", refs: [] };
  }
}
