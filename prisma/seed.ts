import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@truereview.local" },
    update: { isAdmin: true, emailVerifiedAt: new Date() },
    create: {
      email: "admin@truereview.local",
      passwordHash: hashPassword("admin1234"),
      isAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });

  const reviewers = [];
  for (let i = 1; i <= 4; i++) {
    reviewers.push(
      await prisma.user.upsert({
        where: { email: `demo${i}@truereview.local` },
        update: { emailVerifiedAt: new Date() },
        create: {
          email: `demo${i}@truereview.local`,
          passwordHash: hashPassword("demo1234"),
          emailVerifiedAt: new Date(),
          // Backdate so seeded reviews don't trip the new-account heuristic
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      })
    );
  }

  const businesses = [
    {
      slug: "mias-corner-cafe-demo",
      name: "Mia's Corner Cafe",
      category: "Restaurants & Cafes",
      city: "Tel Aviv",
      description: "Neighborhood cafe with fresh pastries and serious espresso.",
    },
    {
      slug: "rapid-fix-auto-demo",
      name: "Rapid Fix Auto",
      category: "Auto Services",
      city: "Haifa",
      description: "Same-day car repairs and inspections.",
    },
    {
      slug: "glow-day-spa-demo",
      name: "Glow Day Spa",
      category: "Beauty & Spa",
      city: "Jerusalem",
      description: "Massage, facials, and a quiet afternoon.",
    },
  ];

  const seededReviews = [
    [
      { rating: 5, text: "The cortado here is the best I've had in the city, and the almond croissant was still warm. Staff were lovely even at rush hour.", pseudonym: "Sunny Wren 42" },
      { rating: 4, text: "Great coffee and pastries, though seating fills up fast on weekends. Go early if you want a table by the window.", pseudonym: "Candid Otter 17" },
    ],
    [
      { rating: 2, text: "Quoted me one price on the phone and charged noticeably more at pickup. The repair itself seems fine so far, but check the total before you agree.", pseudonym: "Frank Badger 88" },
    ],
    [
      { rating: 5, text: "Booked the 60-minute massage and it was genuinely relaxing from start to finish. Clean rooms, no upselling, easy booking.", pseudonym: "Mellow Heron 23" },
    ],
  ];

  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i];
    const business = await prisma.business.upsert({
      where: { slug: b.slug },
      update: {},
      create: { ...b, addedById: admin.id },
    });
    for (let j = 0; j < seededReviews[i].length; j++) {
      const r = seededReviews[i][j];
      const reviewer = reviewers[(i + j) % reviewers.length];
      await prisma.review.upsert({
        where: { businessId_userId: { businessId: business.id, userId: reviewer.id } },
        update: {},
        create: {
          businessId: business.id,
          userId: reviewer.id,
          rating: r.rating,
          text: r.text,
          pseudonym: r.pseudonym,
          createdAt: new Date(Date.now() - (7 + i + j) * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Give every seeded business the same derived fields the app maintains
  // (score, count, freshness, city rank), so a seeded site looks like a
  // real one instead of a list of unrated names.
  const PRIOR_MEAN = 3.5, PRIOR_WEIGHT = 6;
  const all = await prisma.business.findMany({ include: { reviews: { where: { status: { not: "HIDDEN" }, includedInScore: true } } } });
  for (const b of all) {
    const rs = b.reviews;
    const avg = rs.length ? rs.reduce((t, r) => t + r.rating, 0) / rs.length : 0;
    const score = rs.length ? (avg * rs.length + PRIOR_MEAN * PRIOR_WEIGHT) / (rs.length + PRIOR_WEIGHT) : 0;
    const last = rs.reduce<Date | null>((m, r) => (!m || r.createdAt > m ? r.createdAt : m), null);
    await prisma.business.update({ where: { id: b.id }, data: { scoreAvg: score, scoreCount: rs.length, lastReviewedAt: last } });
  }
  const groups = new Map<string, typeof all>();
  for (const b of all) { const k = `${b.city}|${b.category}`; groups.set(k, [...(groups.get(k) ?? []), b]); }
  for (const g of groups.values()) {
    const ranked = (await prisma.business.findMany({ where: { id: { in: g.map((b) => b.id) } } }))
      .sort((a, b) => (b.scoreAvg * Math.log10(b.scoreCount + 2)) - (a.scoreAvg * Math.log10(a.scoreCount + 2)));
    for (const [i, b] of ranked.entries()) {
      await prisma.business.update({ where: { id: b.id }, data: { cityRank: b.scoreCount > 0 ? i + 1 : 0, cityRankSize: ranked.length } });
    }
  }

  console.log("Seeded: admin@truereview.local / admin1234 (admin), demo1-4@truereview.local / demo1234");
}

main().finally(() => prisma.$disconnect());
