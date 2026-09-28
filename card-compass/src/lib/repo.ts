import "server-only";
import type { CatalogCard } from "./catalog/types";
import { db } from "./db";
import { log } from "./log";
import type { PriceReference, SourceId } from "./prices";
import type { Currency } from "./money";

/**
 * Persistence is best-effort: a database outage must not break scanning or
 * price display, so every function catches, logs the event name, and returns
 * a neutral value.
 */

async function upsertCard(card: CatalogCard) {
  const client = db();
  if (!client) return null;
  return client.card.upsert({
    where: { catalogId: card.catalogId },
    create: {
      catalogId: card.catalogId,
      name: card.name,
      number: card.number,
      setId: card.setId,
      setName: card.setName,
      imageUrl: card.imageLarge ?? card.imageSmall,
      rarity: card.rarity,
    },
    update: {
      name: card.name,
      number: card.number,
      setId: card.setId,
      setName: card.setName,
      imageUrl: card.imageLarge ?? card.imageSmall,
      rarity: card.rarity,
    },
  });
}

export async function recordScan(parsedName: string | null, parsedNumber: string | null) {
  try {
    const client = db();
    if (!client) return null;
    const scan = await client.scan.create({ data: { parsedName, parsedNumber, imageRetained: false } });
    return scan.id;
  } catch {
    log.warn("db.record_scan_failed");
    return null;
  }
}

export async function confirmScan(scanId: string, card: CatalogCard) {
  try {
    const client = db();
    if (!client) return false;
    const row = await upsertCard(card);
    if (!row) return false;
    await client.scan.update({ where: { id: scanId }, data: { selectedCardId: row.id } });
    return true;
  } catch {
    log.warn("db.confirm_scan_failed");
    return false;
  }
}

export async function saveSnapshots(card: CatalogCard, refs: PriceReference[]) {
  try {
    const client = db();
    if (!client) return;
    const row = await upsertCard(card);
    if (!row || refs.length === 0) return;
    await client.priceSnapshot.createMany({
      data: refs.map((r) => ({
        cardId: row.id,
        source: r.source,
        sourceCardUrl: r.sourceCardUrl,
        currency: r.currency,
        amountMinor: r.amountMinor,
        subtype: r.subtype,
        finish: r.finish,
        observedAt: new Date(r.observedAt),
        fetchedAt: new Date(r.fetchedAt),
        isDemo: r.isDemo,
      })),
      skipDuplicates: true,
    });
  } catch {
    log.warn("db.save_snapshots_failed");
  }
}

/** Latest stored snapshot per (source, subtype, finish), for use when the source is unreachable. */
export async function loadStoredReferences(catalogId: string, now: number, staleAfterDays: number) {
  try {
    const client = db();
    if (!client) return null;
    const card = await client.card.findUnique({ where: { catalogId } });
    if (!card) return null;
    const rows = await client.priceSnapshot.findMany({
      where: { cardId: card.id },
      orderBy: { observedAt: "desc" },
      take: 200,
    });
    const seen = new Set<string>();
    const refs: PriceReference[] = [];
    for (const r of rows) {
      const k = `${r.source}|${r.subtype}|${r.finish}`;
      if (seen.has(k)) continue;
      seen.add(k);
      refs.push({
        source: r.source as SourceId,
        sourceCardUrl: r.sourceCardUrl,
        currency: r.currency as Currency,
        amountMinor: r.amountMinor,
        subtype: r.subtype,
        finish: r.finish,
        observedAt: r.observedAt.toISOString(),
        fetchedAt: r.fetchedAt.toISOString(),
        stale: now - r.observedAt.getTime() > staleAfterDays * 86_400_000,
        isDemo: r.isDemo,
      });
    }
    return { card, refs };
  } catch {
    log.warn("db.load_snapshots_failed");
    return null;
  }
}
