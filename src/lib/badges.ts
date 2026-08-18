import "server-only";
import { prisma } from "./db";

// Reviewer reputation, earned under a pen name.
//
// Two deliberate choices, both from how this goes wrong elsewhere:
//   · Badges reward BREADTH and QUALITY, never frequency. No streaks, no
//     "reviewed 5 days running" — those push people to pad, which makes the
//     data worse and is the documented failure of Untappd's badge set.
//   · Standing is slow to build, so an account with a record behind it is
//     expensive to burn on one paid review. Reputation doubles as a fraud cost.

export type BadgeTier = { at: number; label: string };

export type BadgeDef = {
  slug: string;
  name: string;
  icon: string;
  /** What the reader learns about this reviewer. */
  meaning: string;
  /** What the reviewer has to do. */
  how: string;
  tiers: BadgeTier[];
};

export const BADGES: BadgeDef[] = [
  {
    slug: "trailblazer",
    name: "Trailblazer",
    icon: "🧭",
    meaning: "Reviews places before anyone else does",
    how: "Be the first person to review a business",
    tiers: [
      { at: 1, label: "Trailblazer" },
      { at: 5, label: "Pathfinder" },
      { at: 20, label: "Cartographer" },
    ],
  },
  {
    slug: "helpful",
    name: "Helpful",
    icon: "👍",
    meaning: "Others found their reviews useful",
    how: "Collect helpful votes on your reviews",
    tiers: [
      { at: 10, label: "Helpful" },
      { at: 50, label: "Very helpful" },
      { at: 200, label: "Indispensable" },
    ],
  },
  {
    slug: "explorer",
    name: "Explorer",
    icon: "🍽️",
    meaning: "Reviews widely, not just one kind of place",
    how: "Review businesses across different categories",
    tiers: [
      { at: 3, label: "Explorer" },
      { at: 6, label: "Wide palate" },
      { at: 10, label: "Omnivore" },
    ],
  },
  {
    slug: "local",
    name: "Local",
    icon: "📍",
    meaning: "Knows more than one neighbourhood",
    how: "Review businesses in different cities",
    tiers: [
      { at: 2, label: "Local" },
      { at: 5, label: "Well travelled" },
      { at: 12, label: "Everywhere" },
    ],
  },
  {
    slug: "factchecker",
    name: "Fact checker",
    icon: "🔍",
    meaning: "Keeps dietary details honest and current",
    how: "Confirm whether kosher, halal, vegan or coeliac details still hold",
    tiers: [
      { at: 5, label: "Fact checker" },
      { at: 25, label: "Verifier" },
      { at: 100, label: "Guardian" },
    ],
  },
  {
    slug: "photographer",
    name: "Photographer",
    icon: "📷",
    meaning: "Shows you the place, doesn't just describe it",
    how: "Add photos to your reviews",
    tiers: [
      { at: 3, label: "Photographer" },
      { at: 15, label: "Documentarian" },
    ],
  },
  {
    slug: "thorough",
    name: "Thorough",
    icon: "✍️",
    meaning: "Writes reviews with real detail in them",
    how: "Write reviews over 300 characters",
    tiers: [
      { at: 5, label: "Thorough" },
      { at: 25, label: "In depth" },
    ],
  },
];

export type EarnedBadge = {
  slug: string;
  name: string;
  icon: string;
  meaning: string;
  how: string;
  /** Current count toward this badge. */
  count: number;
  /** Highest tier reached, or null if not yet earned. */
  label: string | null;
  /** 0-based index of the tier reached. */
  tier: number;
  /** The next tier's threshold, or null when maxed. */
  next: number | null;
};

function evaluate(def: BadgeDef, count: number): EarnedBadge {
  let tier = -1;
  for (let i = 0; i < def.tiers.length; i++) {
    if (count >= def.tiers[i].at) tier = i;
  }
  const next = tier + 1 < def.tiers.length ? def.tiers[tier + 1].at : null;
  return {
    slug: def.slug,
    name: def.name,
    icon: def.icon,
    meaning: def.meaning,
    how: def.how,
    count,
    label: tier >= 0 ? def.tiers[tier].label : null,
    tier,
    next,
  };
}

export type ReviewerStats = {
  reviews: number;
  helpfulVotes: number;
  badges: EarnedBadge[];
  earned: EarnedBadge[];
  memberSince: Date;
};

/** Everything shown on a reviewer's public record. */
export async function reviewerStats(userId: string): Promise<ReviewerStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user) return null;

  const reviews = await prisma.review.findMany({
    where: { userId, status: { not: "HIDDEN" } },
    select: {
      id: true,
      text: true,
      createdAt: true,
      businessId: true,
      business: { select: { category: true, city: true } },
      photos: { select: { id: true } },
      helpfulVotes: { select: { id: true } },
    },
  });

  const helpfulVotes = reviews.reduce((s, r) => s + r.helpfulVotes.length, 0);

  // "First to review" — their review predates every other one on that business.
  let firsts = 0;
  if (reviews.length > 0) {
    const earliest = await prisma.review.groupBy({
      by: ["businessId"],
      where: { businessId: { in: reviews.map((r) => r.businessId) } },
      _min: { createdAt: true },
    });
    const firstAt = new Map(earliest.map((e) => [e.businessId, e._min.createdAt?.getTime()]));
    firsts = reviews.filter((r) => firstAt.get(r.businessId) === r.createdAt.getTime()).length;
  }

  const confirmations = await prisma.tagConfirmation.count({ where: { userId } });

  const counts: Record<string, number> = {
    trailblazer: firsts,
    helpful: helpfulVotes,
    explorer: new Set(reviews.map((r) => r.business.category).filter(Boolean)).size,
    local: new Set(reviews.map((r) => r.business.city).filter(Boolean)).size,
    factchecker: confirmations,
    photographer: reviews.filter((r) => r.photos.length > 0).length,
    thorough: reviews.filter((r) => r.text.length > 300).length,
  };

  const badges = BADGES.map((def) => evaluate(def, counts[def.slug] ?? 0));
  return {
    reviews: reviews.length,
    helpfulVotes,
    badges,
    earned: badges.filter((b) => b.tier >= 0),
    memberSince: user.createdAt,
  };
}
