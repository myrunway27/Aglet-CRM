/**
 * Seeds the database with the bundled DEMO fixture catalog plus 90 days of
 * DEMO reference-price history (all rows flagged isDemo=true), so price
 * charts and top movers have something to show in demo mode.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import fixture from "../fixtures/catalog.json";
import { MockCatalogProvider } from "../src/lib/catalog/mock";
import { toReferences } from "../src/lib/prices";

const prisma = new PrismaClient();
const DAYS = 90;

/** Deterministic PRNG so every seed produces the same demo history. */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

async function main() {
  const catalog = new MockCatalogProvider();
  const now = Date.now();
  let cards = 0;
  let snapshots = 0;
  for (const { id } of (fixture as { cards: Array<{ id: string }> }).cards) {
    const data = await catalog.getCard(id);
    const c = data.card;
    const row = await prisma.card.upsert({
      where: { catalogId: c.catalogId },
      create: { catalogId: c.catalogId, name: c.name, number: c.number, setId: c.setId, setName: c.setName, rarity: c.rarity },
      update: { name: c.name, number: c.number, setId: c.setId, setName: c.setName, rarity: c.rarity },
    });
    cards++;
    const { references } = toReferences(data, { now, staleAfterDays: 7 });
    const rows = [];
    for (const r of references) {
      rows.push(r);
      if (r.subtype !== "market" && r.subtype !== "trend") continue;
      // Walk backwards from the current value; each series gets its own drift.
      const rand = rng(`${c.catalogId}|${r.source}|${r.finish}|${r.subtype}`);
      const drift = (rand() - 0.5) * 0.02;
      let v = r.amountMinor;
      for (let d = 1; d < DAYS; d++) {
        v = Math.max(1, Math.round(v / (1 + drift + (rand() - 0.5) * 0.06)));
        rows.push({ ...r, amountMinor: v, observedAt: new Date(Date.parse(r.observedAt) - d * 86_400_000).toISOString() });
      }
    }
    const res = await prisma.priceSnapshot.createMany({
      data: rows.map((r) => ({
        cardId: row.id,
        source: r.source,
        sourceCardUrl: r.sourceCardUrl,
        currency: r.currency,
        amountMinor: r.amountMinor,
        subtype: r.subtype,
        finish: r.finish,
        observedAt: new Date(r.observedAt),
        fetchedAt: new Date(now),
        isDemo: true,
      })),
      skipDuplicates: true,
    });
    snapshots += res.count;
  }
  console.log(`Seeded ${cards} demo cards and ${snapshots} demo price snapshots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
