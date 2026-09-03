// Sets Business.lastReviewedAt from existing reviews. Safe to run repeatedly:
// it only writes where the cached value disagrees with the reviews.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const businesses = await prisma.business.findMany({
  select: { id: true, lastReviewedAt: true },
});

let updated = 0;
for (const b of businesses) {
  const newest = await prisma.review.findFirst({
    where: { businessId: b.id, status: { not: "HIDDEN" }, includedInScore: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const want = newest?.createdAt ?? null;
  const have = b.lastReviewedAt;
  const same = want && have ? want.getTime() === have.getTime() : want === have;
  if (same) continue;
  await prisma.business.update({ where: { id: b.id }, data: { lastReviewedAt: want } });
  updated++;
}

console.log(`backfill-last-reviewed: set ${updated} of ${businesses.length}`);
await prisma.$disconnect();
