"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isInterval, isTierId, MEMBERSHIP_NAME, tierById } from "@/lib/membership";
import { billingConfigured, priceIdFor, siteUrl, stripe } from "@/lib/stripe";

export type BillingState = { error?: string } | undefined;

/**
 * Start a hosted Stripe Checkout for one tier. Card details never touch this
 * server: we hand back a Stripe-hosted URL and redirect to it.
 */
export async function startCheckout(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in first." };

  const tierId = String(formData.get("tier") ?? "");
  const interval = String(formData.get("interval") ?? "");
  if (!isTierId(tierId) || !isInterval(interval)) return { error: "Unknown plan." };

  if (!billingConfigured()) {
    return { error: "Online payment isn't switched on yet — email hello@truereview.me to join." };
  }

  const priceId = priceIdFor(tierId, interval);
  if (!priceId) return { error: "That plan isn't available right now." };

  const s = stripe();

  // One Stripe customer per user, reused forever, so a member who cancels and
  // comes back keeps one billing history instead of sprouting duplicates.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl()}/owner?joined=1`,
    cancel_url: `${siteUrl()}/owner`,
    allow_promotion_codes: true,
    // Echoed back on the webhook, so a delayed or out-of-order event can
    // still be attributed without a database lookup by email.
    subscription_data: {
      metadata: { userId: user.id, tier: tierId, interval },
    },
    metadata: { userId: user.id, tier: tierId, interval },
  });

  if (!session.url) return { error: "Stripe did not return a checkout page. Please try again." };
  redirect(session.url);
}

/**
 * Send a member to Stripe's own billing portal to change card, switch plan or
 * cancel. Self-service on purpose — cancelling should never require emailing us.
 */
export async function openBillingPortal(
  _prev: BillingState,
  _formData: FormData
): Promise<BillingState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in first." };
  if (!billingConfigured() || !user.stripeCustomerId) {
    return { error: `No ${MEMBERSHIP_NAME} billing account found.` };
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteUrl()}/owner`,
  });
  redirect(session.url);
}

/** Display helper: the tier a logged-in user is currently paying for. */
export async function currentTierLabel(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user?.proTier) return null;
  return tierById(user.proTier)?.name ?? null;
}
