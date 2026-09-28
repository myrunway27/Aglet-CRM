/**
 * Seeds the Card table with the DEMO catalog (fictional sets) so the database
 * has rows in development. Demo prices are intentionally not written to
 * PriceSnapshot: that table is reserved for real, source-attributed references.
 */
import { PrismaClient } from "@prisma/client";
import { MOCK_CARDS } from "../src/lib/catalog/mock-data";
import { mockToCatalogCard } from "../src/lib/catalog/mock";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  for (const rec of MOCK_CARDS) {
    const c = mockToCatalogCard(rec, now);
    const data = { name: c.name, number: c.number, setId: c.setId, setName: c.setName, imageUrl: c.imageUrl, rarity: c.rarity };
    await prisma.card.upsert({ where: { catalogId: c.catalogId }, create: { catalogId: c.catalogId, ...data }, update: data });
  }
  console.log(`Seeded ${MOCK_CARDS.length} demo cards.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
