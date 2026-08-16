import "server-only";
import { prisma } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Max reviews a single account may post per rolling 24 hours. */
export const MAX_REVIEWS_PER_DAY = 3;

export async function isOverDailyLimit(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - DAY_MS);
  const count = await prisma.review.count({
    where: { userId, createdAt: { gte: since } },
  });
  return count >= MAX_REVIEWS_PER_DAY;
}

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const w of a) if (b.has(w)) overlap++;
  return overlap / (a.size + b.size - overlap);
}

/**
 * Fake-review heuristics, aimed at the "competitor posts a bunch of BS"
 * attack. Reviews still publish immediately ("live instantly, flag after"),
 * but a hit here marks the review FLAGGED and puts it in the admin queue.
 *
 * Returns a human-readable flag reason, or null if the review looks clean.
 */
export async function detectSuspiciousReview(params: {
  userId: string;
  businessId: string;
  rating: number;
  text: string;
}): Promise<string | null> {
  const { userId, businessId, rating, text } = params;
  const now = Date.now();

  // 1. Brand-new account posting an extreme rating. Competitors typically
  //    make a throwaway account and immediately post 1-star (or shill 5-star).
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accountAgeMs = now - user.createdAt.getTime();
  if (accountAgeMs < DAY_MS && (rating <= 1 || rating >= 5)) {
    return "Extreme rating from an account less than 24 hours old";
  }

  const recent = await prisma.review.findMany({
    where: {
      businessId,
      createdAt: { gte: new Date(now - 3 * DAY_MS) },
      status: { not: "HIDDEN" },
    },
    select: { rating: true, text: true },
  });

  // 2. Pile-on burst: several low ratings landing on one business within a
  //    short window looks like a coordinated attack.
  if (rating <= 2) {
    const recentLow = recent.filter((r) => r.rating <= 2).length;
    if (recentLow >= 2) {
      return "Part of a burst of low ratings on this business within 3 days";
    }
  }

  // 3. Near-duplicate wording vs. other recent reviews of the same business —
  //    copy-pasted spam from multiple throwaway accounts.
  const words = wordSet(text);
  for (const other of recent) {
    if (jaccard(words, wordSet(other.text)) >= 0.6) {
      return "Wording nearly duplicates another recent review of this business";
    }
  }

  return null;
}
