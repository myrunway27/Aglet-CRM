// Pure translation from a Stripe subscription to this site's membership
// state. Deliberately free of imports and I/O so it can be unit-tested
// without Stripe, a database, or a network — every webhook ultimately
// funnels through here, so this is the function that must be right.

export type SubShape = {
  status: string;
  /** Unix seconds when the paid-for period ends. */
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  items?: { data?: { price?: { id?: string | null } | null }[] } | null;
};

export type Membership = {
  proTier: string | null;
  proUntil: Date | null;
};

// Statuses that mean "this person has paid for access right now".
//
// `past_due` is included on purpose: the card failed but Stripe is still
// retrying, and the period they already paid for has not ended. Cutting
// access off mid-period over a temporarily declined card would be both
// wrong and a good way to lose a customer who just got a new card.
const ENTITLED = new Set(["active", "trialing", "past_due"]);

const GRACE_DAYS = 3;

/**
 * @param sub          the Stripe subscription
 * @param resolveTier  maps a Stripe price ID to one of our tier IDs
 */
export function membershipFromSubscription(
  sub: SubShape,
  resolveTier: (priceId: string) => string | null
): Membership {
  if (!ENTITLED.has(sub.status)) return { proTier: null, proUntil: null };

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const tier = priceId ? resolveTier(priceId) : null;
  if (!tier) return { proTier: null, proUntil: null };

  if (!sub.current_period_end) return { proTier: null, proUntil: null };

  // A few days past the period end, so a renewal that is a little slow to
  // land does not briefly lock a paying member out of their own replies.
  const endMs = sub.current_period_end * 1000 + GRACE_DAYS * 24 * 3600 * 1000;
  return { proTier: tier, proUntil: new Date(endMs) };
}

/** Membership state for a subscription that has ended outright. */
export function endedMembership(): Membership {
  return { proTier: null, proUntil: null };
}
