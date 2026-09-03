import "server-only";
import { prisma } from "./db";

// How a score is produced, in one place so the public /trust page and the
// code can't drift apart.
//
//  1. Reviews an owner dispute won, or our own checks flagged, are excluded
//     entirely (they stay readable — they just don't count).
//  2. Older reviews count for less, so a score describes the business now.
//  3. The result is pulled toward the site-wide average in proportion to how
//     little evidence there is, so one review can't mint a perfect 5.0.

export const PRIOR_WEIGHT = 6; // ≈ how many reviews of evidence the prior is worth
export const PRIOR_MEAN = 3.5;
export const HALF_LIFE_MONTHS = 18;

export function recencyWeight(createdAt: Date, now = new Date()): number {
  const months = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.pow(0.5, Math.max(0, months) / HALF_LIFE_MONTHS);
}

export function bayesianScore(
  reviews: { rating: number; createdAt: Date }[],
  now = new Date()
): { score: number; count: number } {
  if (reviews.length === 0) return { score: 0, count: 0 };
  let weighted = 0;
  let weight = 0;
  for (const r of reviews) {
    const w = recencyWeight(r.createdAt, now);
    weighted += r.rating * w;
    weight += w;
  }
  const score = (weighted + PRIOR_MEAN * PRIOR_WEIGHT) / (weight + PRIOR_WEIGHT);
  return { score, count: reviews.length };
}

// The raw, unshrunk average — shown alongside the score once a business has
// enough reviews for the two to agree anyway.
export function plainAverage(reviews: { rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

// A business is "thinly reviewed" while the prior is still doing real work;
// we say so in plain language rather than showing a confident-looking number.
export function isThin(count: number): boolean {
  return count < 4;
}

// Recompute and cache a business's score. Called after every review write.
export async function refreshBusinessScore(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { scoreFrozen: true },
  });
  if (!business || business.scoreFrozen) return;

  const reviews = await prisma.review.findMany({
    where: { businessId, status: { not: "HIDDEN" }, includedInScore: true },
    select: { rating: true, createdAt: true },
  });
  const { score } = bayesianScore(reviews);

  // Cache the newest review's date alongside the score. Search sorts and
  // filters on freshness, and doing it here keeps the two in step: a review
  // that stops counting also stops making the business look recently visited.
  let lastReviewedAt: Date | null = null;
  for (const r of reviews) {
    if (!lastReviewedAt || r.createdAt > lastReviewedAt) lastReviewedAt = r.createdAt;
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      scoreAvg: reviews.length ? score : 0,
      scoreCount: reviews.length,
      lastReviewedAt,
    },
  });
}
