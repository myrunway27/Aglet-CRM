import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled, tierForPriceId } from "@/lib/stripe";
import {
  endedMembership,
  membershipFromSubscription,
  type SubShape,
} from "@/lib/subscription";

export const dynamic = "force-dynamic";
// The signature is computed over the exact bytes Stripe sent, so this route
// must read the raw body — never req.json().
export const runtime = "nodejs";

const RELEVANT = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

async function applySubscription(sub: Stripe.Subscription) {
  const membership =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? endedMembership()
      : membershipFromSubscription(sub as unknown as SubShape, tierForPriceId);

  // Prefer the userId we stamped at checkout; fall back to the customer ID so
  // a subscription created in the Stripe dashboard still lands on the account.
  const userId = sub.metadata?.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : customerId
      ? await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
      : null;

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      proTier: membership.proTier,
      proUntil: membership.proUntil,
      stripeSubscriptionId: membership.proTier ? sub.id : null,
      ...(customerId && !user.stripeCustomerId ? { stripeCustomerId: customerId } : {}),
    },
  });
}

export async function POST(req: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "billing disabled" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook secret not set" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    // An unverifiable body is either a misconfiguration or someone trying to
    // grant themselves a membership. Either way it never reaches the database.
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (!RELEVANT.has(event.type)) return NextResponse.json({ received: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subId) await applySubscription(await stripe().subscriptions.retrieve(subId));
    } else {
      await applySubscription(event.data.object as Stripe.Subscription);
    }
  } catch (err) {
    // Return 500 so Stripe retries rather than dropping a paid signup.
    console.error("stripe webhook failed", event.type, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
