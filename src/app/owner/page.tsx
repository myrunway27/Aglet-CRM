import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { OwnerReplyForm } from "@/components/OwnerReplyForm";
import { InviteForm } from "@/components/InviteForm";
import { BadgeSnippet } from "@/components/BadgeSnippet";
import {
  canReply,
  canInvite,
  tierName,
  MEMBERSHIP_NAME,
  TIERS,
  formatCents,
  annualSavingCents,
} from "@/lib/membership";
import { billingConfigured } from "@/lib/stripe";
import { PlanPicker } from "@/components/PlanPicker";
import { ManageBilling } from "@/components/ManageBilling";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; joined?: string }>;
}) {
  const { claimed, joined } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/owner");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id },
    include: {
      reviews: {
        where: { status: { not: "HIDDEN" } },
        include: { ownerReply: true },
        orderBy: { createdAt: "desc" },
      },
      saves: true,
    },
  });

  const tier = tierName(user);
  const mayReply = canReply(user);
  const mayInvite = canInvite(user);
  const payments = billingConfigured();
  const plans = TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    monthly: formatCents(t.monthlyCents),
    annual: formatCents(t.annualCents),
    annualSaving: formatCents(annualSavingCents(t)),
    features: t.features,
  }));

  return (
    <div>
      {claimed && (
        <div className="mt-4 bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
          <p className="font-medium text-brand-800">✓ You are now the verified owner.</p>
          <p className="mt-1 text-stone-600">
            Your business is listed below — you can reply publicly to any of its reviews.
          </p>
        </div>
      )}
      {joined && (
        <div className="mt-4 bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
          <p className="font-medium text-brand-800">✓ You&apos;re a member — thank you.</p>
          <p className="mt-1 text-stone-600">
            Your receipt is on its way by email. If the plan below still looks unchanged, give it
            a few seconds and refresh — Stripe confirms the payment to us in the background.
          </p>
        </div>
      )}
      <h1 className="text-2xl font-bold mt-4">My businesses</h1>
      {businesses.length > 0 && (
        <div
          className={`mt-3 rounded-xl border p-4 text-sm ${
            tier ? "bg-brand-50 border-brand-100" : "bg-white border-stone-200"
          }`}
        >
          {tier ? (
            <>
            <p>
              <span className="font-semibold text-brand-800">✓ {MEMBERSHIP_NAME} — {tier}</span>{" "}
              <span className="text-stone-600">
                {user.proUntil && `until ${user.proUntil.toLocaleDateString()}`}
              </span>
            </p>
            {payments && user.stripeCustomerId && <ManageBilling />}
            </>
          ) : (
            <>
              <p className="font-semibold">{MEMBERSHIP_NAME}</p>
              <PlanPicker plans={plans} enabled={payments} />
              <p className="mt-2 text-xs text-stone-500">
                Your listing, stats, disputes and rating badge are free forever. Membership never
                touches your rating — scores are computed identically for everyone, sponsored
                placement is always labelled, and money can never remove a review.
              </p>
            </>
          )}
        </div>
      )}
      <p className="text-sm text-stone-600 mt-1">
        Reply publicly to reviews. Reviewers are anonymous — pen names are all anyone sees. If a
        review is genuinely wrong, use &ldquo;Dispute this review&rdquo; on the business page and
        give us evidence; upheld disputes stop a review counting toward your rating, though we
        never delete it.
      </p>

      {businesses.length === 0 && (
        <p className="mt-6 text-sm text-stone-500">
          You don&apos;t own any verified businesses yet. Find your business and click
          &ldquo;Claim it&rdquo; on its page.
        </p>
      )}

      <div className="mt-4 space-y-6">
        {businesses.map((b) => (
          <section key={b.id} className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/business/${b.slug}`}
                className="text-lg font-semibold text-brand-700 hover:underline"
              >
                {b.name}
              </Link>
              <span className="text-xs bg-brand-100 text-brand-800 px-2.5 py-1 rounded-full">
                ✓ Verified owner
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Rating", value: b.scoreCount ? b.scoreAvg.toFixed(1) : "—" },
                { label: "Reviews", value: b.scoreCount },
                {
                  label: "Awaiting reply",
                  value: b.reviews.filter((r) => !r.ownerReply).length,
                },
                { label: "Saved by", value: b.saves.length },
              ].map((s) => (
                <div key={s.label} className="bg-stone-50 rounded-lg border border-stone-200 p-2 text-center">
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-stone-600">{s.label}</p>
                </div>
              ))}
            </div>
            {b.cityRank > 0 && (
              <p className="mt-2 text-sm text-brand-700">
                Ranked #{b.cityRank} of {b.cityRankSize} {b.category.toLowerCase()} in {b.city}
              </p>
            )}
            {b.scoreFrozen && (
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Your score is temporarily on hold after an unusual burst of reviews. A moderator is
                looking — nothing has been deleted.
              </p>
            )}
            <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
              <summary className="text-sm font-medium cursor-pointer">
                Your rating badge <span className="text-stone-400 font-normal">— for your website</span>
              </summary>
              <div className="mt-2">
                <BadgeSnippet slug={b.slug} />
              </div>
            </details>
            {mayInvite && (
              <details className="mt-2 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
                <summary className="text-sm font-medium cursor-pointer">
                  Invite customers to review
                </summary>
                <div className="mt-2">
                  <InviteForm businessId={b.id} />
                </div>
              </details>
            )}
            <div className="mt-3 space-y-3">
              {b.reviews.map((r) => (
                <div key={r.id} className="border-t border-stone-100 pt-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-700">🕶️ {r.pseudonym}</span>
                    <Stars rating={r.rating} size="text-sm" />
                    <span>{r.createdAt.toLocaleDateString()}</span>
                    {!r.ownerReply && (
                      <span className="ml-auto text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Needs reply
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{r.text}</p>
                  {r.ownerReply && (
                    <p className="mt-1 text-xs text-stone-500">
                      Your reply: <span className="text-stone-700">{r.ownerReply.text}</span>
                    </p>
                  )}
                  <OwnerReplyForm reviewId={r.id} existingText={r.ownerReply?.text} />
                </div>
              ))}
              {b.reviews.length === 0 && (
                <p className="text-sm text-stone-500">No reviews yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
