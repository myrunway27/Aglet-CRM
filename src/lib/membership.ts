import "server-only";

// True Review for Business — three tiers, monthly or annual.
//
// Free forever (defensive): claim your business, edit details, see stats,
// dispute reviews with evidence, and the embeddable rating badge (it spreads
// the site's name, so it stays free on purpose).
//
// The paywall never touches moderation or ratings: a member's score is
// computed identically to a non-member's, money can never remove a review,
// and sponsored placement is always labelled as such.
//
// Annual is priced at ten months for twelve. That is mostly self-interest:
// a $9.99 charge costs ~59c to process, of which 30c is a flat per-charge
// fee, so billing once a year instead of twelve times cuts the payment
// processor's cut from ~6.4% to ~3.7% of revenue.

export const MEMBERSHIP_NAME = "True Review for Business";

export type TierId = "starter" | "growth" | "spotlight";
export type Interval = "monthly" | "annual";

export type Tier = {
  id: TierId;
  name: string;
  rank: number;
  /** Display price, monthly billing. Kept as `price` too for older callers. */
  price: string;
  monthlyCents: number;
  annualCents: number;
  features: string[];
};

export const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    rank: 1,
    price: "$9.99/mo",
    monthlyCents: 999,
    annualCents: 9990,
    features: ["Reply publicly to every review"],
  },
  {
    id: "growth",
    name: "Growth",
    rank: 2,
    price: "$14.99/mo",
    monthlyCents: 1499,
    annualCents: 14990,
    features: ["Everything in Starter", "Invite your customers to review (100/month)"],
  },
  {
    id: "spotlight",
    name: "Spotlight",
    rank: 3,
    price: "$19.99/mo",
    monthlyCents: 1999,
    annualCents: 19990,
    features: [
      "Everything in Growth",
      "Featured placement in your city — clearly labelled “Sponsored”",
    ],
  },
];

export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export function isTierId(v: string): v is TierId {
  return TIERS.some((t) => t.id === v);
}

export function isInterval(v: string): v is Interval {
  return v === "monthly" || v === "annual";
}

/** "$9.99" / "$99.90" — no interval suffix. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** What the annual price saves against paying monthly for a year. */
export function annualSavingCents(t: Tier): number {
  return t.monthlyCents * 12 - t.annualCents;
}

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
