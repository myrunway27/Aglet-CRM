import "server-only";
import type { CatalogCard, PriceReference } from "../types";
import { db } from "./db";
import { errInfo, log } from "./log";

/**
 * Persistence is best-effort: a database outage must not break scanning or
 * price display. Failures are logged without payloads.
 */
async function safely<T>(event: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    log("warn", event, errInfo(err));
    return null;
  }
}

async function upsertCard(card: CatalogCard): Promise<string | null> {
  const client = db();
  if (!client) return null;
  const data = {
    name: card.name,
    number: card.number,
    setId: card.setId,
    setName: card.setName,
    imageUrl: card.imageUrl,
    rarity: card.rarity,
  };
  const row = await client.card.upsert({
    where: { catalogId: card.catalogId },
    create: { catalogId: card.catalogId, ...data },
    update: data,
    select: { id: true },
  });
  return row.id;
}

export async function recordScan(parsedName: string | null, parsedNumber: string | null): Promise<string | null> {
  const client = db();
  if (!client) return null;
  return safely("db.scan.create_failed", async () => {
    const row = await client.scan.create({ data: { parsedName, parsedNumber, imageRetained: false } });
    return row.id;
  });
}

export async function confirmScan(scanId: string, card: CatalogCard): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const ok = await safely("db.scan.confirm_failed", async () => {
    const cardId = await upsertCard(card);
    if (!cardId) return false;
    const res = await client.scan.updateMany({ where: { id: scanId }, data: { selectedCardId: cardId } });
    return res.count === 1;
  });
  return ok ?? false;
}

/** Save non-demo reference snapshots (deduplicated by card/source/finish/subtype/observedAt). */
export async function saveSnapshots(card: CatalogCard): Promise<void> {
  const client = db();
  if (!client) return;
  const refs = card.prices.filter((p) => !p.demo);
  await safely("db.snapshot.save_failed", async () => {
    const cardId = await upsertCard(card);
    if (!cardId || refs.length === 0) return;
    await client.priceSnapshot.createMany({
      data: refs.map((r) => ({
        cardId,
        source: r.source,
        sourceCardUrl: r.sourceUrl,
        currency: r.currency,
        amountMinor: r.amountMinor,
        subtype: r.subtype,
        finish: r.finish,
        observedAt: new Date(r.observedAt),
      })),
      skipDuplicates: true,
    });
  });
}

/** Last saved snapshots for a card, used when the live source is unavailable. */
export async function loadSavedCard(catalogId: string): Promise<CatalogCard | null> {
  const client = db();
  if (!client) return null;
  return safely("db.snapshot.load_failed", async () => {
    const card = await client.card.findUnique({ where: { catalogId } });
    if (!card) return null;
    const base = {
      catalogId,
      name: card.name,
      number: card.number,
      setId: card.setId,
      setName: card.setName,
      setPrintedTotal: null,
      setCode: null,
      setReleaseDate: null,
      imageUrl: card.imageUrl,
      rarity: card.rarity,
    };
    const latest = await client.priceSnapshot.findFirst({ where: { cardId: card.id }, orderBy: { fetchedAt: "desc" } });
    if (!latest) return { ...base, finishes: [], prices: [] };
    const rows = await client.priceSnapshot.findMany({
      where: { cardId: card.id, fetchedAt: { gte: new Date(latest.fetchedAt.getTime() - 60_000) } },
    });
    const labels: Record<string, string> = {
      market: "Market price",
      low: "Low",
      mid: "Mid",
      high: "High",
      trend: "Trend price",
      averageSell: "Average sell price",
      avg30: "30-day average",
    };
    const prices: PriceReference[] = rows.map((r) => ({
      source: r.source as PriceReference["source"],
      sourceLabel: r.source === "tcgplayer" ? "TCGplayer" : "Cardmarket",
      sourceUrl: r.sourceCardUrl,
      currency: r.currency,
      amountMinor: r.amountMinor,
      subtype: r.subtype,
      subtypeLabel: labels[r.subtype] ?? r.subtype,
      finish: r.finish as PriceReference["finish"],
      observedAt: r.observedAt.toISOString(),
      demo: false,
    }));
    return { ...base, finishes: [...new Set(prices.map((p) => p.finish))], prices };
  });
}
