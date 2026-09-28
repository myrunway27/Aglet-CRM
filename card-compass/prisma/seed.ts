/**
 * Seeds the database with the bundled DEMO fixture catalog and its demo price
 * references (flagged isDemo=true). Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { MockCatalogProvider } from "../src/lib/catalog/mock";
import fixture from "../fixtures/catalog.json";
import { toReferences } from "../src/lib/prices";

const prisma = new PrismaClient();

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
    const res = await prisma.priceSnapshot.createMany({
      data: references.map((r) => ({
        cardId: row.id,
        source: r.source,
        sourceCardUrl: r.sourceCardUrl,
        currency: r.currency,
        amountMinor: r.amountMinor,
        subtype: r.subtype,
        finish: r.finish,
        observedAt: new Date(r.observedAt),
        fetchedAt: new Date(r.fetchedAt),
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
