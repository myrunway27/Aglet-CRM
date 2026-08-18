// Copies each user's pen name from their earliest review onto the user
// record, for accounts created before pen names lived on the user.
// Idempotent and safe to re-run.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { pseudonym: null },
  select: { id: true },
});
let filled = 0;
for (const u of users) {
  const first = await prisma.review.findFirst({
    where: { userId: u.id },
    orderBy: { createdAt: "asc" },
    select: { pseudonym: true },
  });
  if (!first?.pseudonym) continue;
  const taken = await prisma.user.findFirst({ where: { pseudonym: first.pseudonym } });
  if (taken) continue;
  await prisma.user.update({ where: { id: u.id }, data: { pseudonym: first.pseudonym } });
  filled++;
}
console.log(`backfill-pseudonyms: set ${filled} of ${users.length}`);
await prisma.$disconnect();
