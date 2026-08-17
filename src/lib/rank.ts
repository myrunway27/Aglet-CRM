import "server-only";
import { prisma } from "./db";

// "#3 of 47 kosher restaurants in Teaneck" — an ordinal is far more decisive
// than a star average, and it makes a whole city browsable as a leaderboard.
// Ranked on the cached score, which already handles recency and thin evidence.

export async function refreshCityRanks(city: string, category: string) {
  // Unplaced listings (no city or category yet) are simply not ranked.
  if (!city || !category) return;
  const businesses = await prisma.business.findMany({
    where: { city, category },
    select: { id: true, scoreAvg: true, scoreCount: true },
  });
  // Businesses with no reviews at all are listed but not ranked.
  const ranked = businesses
    .filter((b) => b.scoreCount > 0)
    .sort((a, b) => b.scoreAvg - a.scoreAvg || b.scoreCount - a.scoreCount);

  const size = ranked.length;
  await prisma.$transaction([
    ...ranked.map((b, i) =>
      prisma.business.update({
        where: { id: b.id },
        data: { cityRank: i + 1, cityRankSize: size },
      })
    ),
    ...businesses
      .filter((b) => b.scoreCount === 0)
      .map((b) =>
        prisma.business.update({
          where: { id: b.id },
          data: { cityRank: 0, cityRankSize: size },
        })
      ),
  ]);
}
