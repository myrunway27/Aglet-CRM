import "server-only";

// True Review for Business — three tiers.
//
// Free forever (defensive): claim your business, edit details, see stats,
// dispute reviews with evidence, and the embeddable rating badge (it spreads
// the site's name, so it stays free on purpose).
//
// The paywall never touches moderation or ratings: a member's score is
// computed identically to a non-member's, money can never remove a review,
// and sponsored placement is always labelled as such.

export const MEMBERSHIP_NAME = "True Review for Business";

export type TierId = "starter" | "growth" | "spotlight";

export const TIERS: { id: TierId; name: string; price: string; rank: number; features: string[] }[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$9.99/mo",
    rank: 1,
    features: ["Reply publicly to every review"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$14.99/mo",
    rank: 2,
    features: ["Everything in Starter", "Invite your customers to review (100/month)"],
  },
  {
    id: "spotlight",
    name: "Spotlight",
    price: "$19.99/mo",
    rank: 3,
    features: [
      "Everything in Growth",
      "Featured placement in your city — clearly labelled “Sponsored”",
    ],
  },
];

const RANK: Record<string, number> = { starter: 1, growth: 2, spotlight: 3 };

type MemberLike = { proUntil: Date | null; proTier: string | null } | null | undefined;

function activeRank(user: MemberLike): number {
  if (!user?.proUntil || user.proUntil.getTime() <= Date.now()) return 0;
  return RANK[user.proTier ?? ""] ?? 1;
}

/** Starter and up: public replies. */
export function canReply(user: MemberLike): boolean {
  return activeRank(user) >= 1;
}

/** Growth and up: customer invitations. */
export function canInvite(user: MemberLike): boolean {
  return activeRank(user) >= 2;
}

/** Spotlight: sponsored placement in the business's city. */
export function canSpotlight(user: MemberLike): boolean {
  return activeRank(user) >= 3;
}

export function tierName(user: MemberLike): string | null {
  const r = activeRank(user);
  return r ? TIERS.find((t) => t.rank === r)!.name : null;
}
