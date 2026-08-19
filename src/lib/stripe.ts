import "server-only";
import Stripe from "stripe";
import { type Interval, type TierId, TIERS } from "@/lib/membership";

// Payments are optional. With no STRIPE_SECRET_KEY the site runs exactly as
// it did before — the owner dashboard falls back to "email us to join" — so
// a missing key is never a crash, only a missing button.

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key);
  return client;
}

// Price IDs live in the environment, not in code: the same build has to work
// against test-mode and live-mode prices, and those IDs differ.
function priceEnvKey(tier: TierId, interval: Interval): string {
  return `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
}

export function priceIdFor(tier: TierId, interval: Interval): string | null {
  return process.env[priceEnvKey(tier, interval)] || null;
}

/** Which tier a Stripe price ID corresponds to, for the webhook's reverse lookup. */
export function tierForPriceId(priceId: string): TierId | null {
  for (const t of TIERS) {
    for (const i of ["monthly", "annual"] as Interval[]) {
      if (priceIdFor(t.id, i) === priceId) return t.id;
    }
  }
  return null;
}

/** True when every tier has both prices configured. */
export function pricesConfigured(): boolean {
  return TIERS.every((t) => priceIdFor(t.id, "monthly") && priceIdFor(t.id, "annual"));
}

export function billingConfigured(): boolean {
  return stripeEnabled() && pricesConfigured();
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "https://www.truereview.me").replace(/\/$/, "");
}
