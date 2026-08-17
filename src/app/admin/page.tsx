import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decideClaim, moderateReview } from "@/actions/admin";
import { decideFlag, setReviewScored, unfreezeScore } from "@/actions/dispute";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  const [claims, flagged, reported, disputes, frozen] = await Promise.all([
    prisma.ownerClaim.findMany({
      where: { status: "PENDING" },
      include: { business: true, user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.review.findMany({
      where: { status: "FLAGGED" },
      include: { business: true, user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.report.findMany({
      where: { status: "OPEN", review: { status: { not: "HIDDEN" } } },
      include: { review: { include: { business: true, user: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reviewFlag.findMany({
      where: { status: "OPEN" },
      include: { review: { include: { business: true } }, owner: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.business.findMany({
      where: { scoreFrozen: true },
      orderBy: { scoreFrozenAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <Link href="/admin/outbox" className="text-sm text-brand-700 hover:underline">
          Email outbox →
        </Link>
      </div>
      <p className="text-sm text-stone-600 mt-1">
        Only admins see this page — including the real accounts behind reviews, which stay hidden
        everywhere else.
      </p>

      {frozen.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-lg">
            Scores on hold <span className="text-stone-400">({frozen.length})</span>
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            An unusual burst of reviews arrived. Reviews stay visible; the score is frozen until you
            clear it.
          </p>
          <div className="mt-2 space-y-2">
            {frozen.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-amber-300 p-4 flex items-center justify-between gap-3 flex-wrap"
              >
                <span>
                  <Link href={`/business/${b.slug}`} className="font-medium text-brand-700 hover:underline">
                    {b.name}
                  </Link>
                  <span className="text-sm text-stone-500"> · {b.city}</span>
                </span>
                <form action={unfreezeScore.bind(null, b.id)}>
                  <button className="text-sm rounded-lg bg-brand-700 text-white px-3 py-1.5 hover:bg-brand-800 cursor-pointer">
                    Clear and recalculate
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {disputes.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-lg">
            Owner disputes <span className="text-stone-400">({disputes.length})</span>
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Upholding a dispute stops the review counting toward the rating. It is never deleted.
          </p>
          <div className="mt-2 space-y-2">
            {disputes.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-sm">
                  <strong>{d.owner.email}</strong> disputes a {d.review.rating}★ review of{" "}
                  <Link href={`/business/${d.review.business.slug}`} className="text-brand-700 hover:underline">
                    {d.review.business.name}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-stone-600 italic">&ldquo;{d.review.text.slice(0, 300)}&rdquo;</p>
                <p className="mt-2 text-sm bg-stone-50 border border-stone-200 rounded-lg p-2">
                  <span className="text-xs text-stone-500 block">Evidence given:</span>
                  {d.evidence}
                </p>
                <div className="mt-2 flex gap-2">
                  <form action={decideFlag.bind(null, d.id, true)}>
                    <button className="text-sm rounded-lg bg-amber-600 text-white px-3 py-1.5 hover:bg-amber-700 cursor-pointer">
                      Uphold — stop counting it
                    </button>
                  </form>
                  <form action={decideFlag.bind(null, d.id, false)}>
                    <button className="text-sm rounded-lg border border-stone-300 px-3 py-1.5 hover:border-brand-600 cursor-pointer">
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold text-lg">
          Owner claims <span className="text-stone-400">({claims.length})</span>
        </h2>
        <div className="mt-2 space-y-2">
          {claims.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-sm">
                <strong>{c.user.email}</strong> claims{" "}
                <Link
                  href={`/business/${c.business.slug}`}
                  className="text-brand-700 font-medium hover:underline"
                >
                  {c.business.name}
                </Link>{" "}
                <span className="text-stone-500">({c.business.city})</span>
              </p>
              <p className="mt-1 text-sm text-stone-600 bg-stone-50 rounded-lg p-2 whitespace-pre-wrap">
                {c.evidence}
              </p>
              <div className="mt-2 flex gap-2">
                <form action={decideClaim.bind(null, c.id, true)}>
                  <button className="rounded-lg bg-brand-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-800 cursor-pointer">
                    Approve
                  </button>
                </form>
                <form action={decideClaim.bind(null, c.id, false)}>
                  <button className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium hover:bg-stone-300 cursor-pointer">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
          {claims.length === 0 && <p className="text-sm text-stone-500">No pending claims.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg">
          Auto-flagged reviews <span className="text-stone-400">({flagged.length})</span>
        </h2>
        <p className="text-xs text-stone-500">
          Caught by the fake-review heuristics. They are still live — hide them if they look fake,
          or clear the flag if they look genuine.
        </p>
        <div className="mt-2 space-y-2">
          {flagged.map((r) => (
            <ReviewModerationCard
              key={r.id}
              reviewId={r.id}
              businessName={r.business.name}
              businessSlug={r.business.slug}
              rating={r.rating}
              text={r.text}
              pseudonym={r.pseudonym}
              authorEmail={r.user.email}
              accountCreated={r.user.createdAt}
              note={`⚠ ${r.flagReason ?? "Flagged"}`}
            />
          ))}
          {flagged.length === 0 && <p className="text-sm text-stone-500">Queue is empty.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg">
          Reported reviews <span className="text-stone-400">({reported.length})</span>
        </h2>
        <div className="mt-2 space-y-2">
          {reported.map((rep) => (
            <ReviewModerationCard
              key={rep.id}
              reviewId={rep.review.id}
              businessName={rep.review.business.name}
              businessSlug={rep.review.business.slug}
              rating={rep.review.rating}
              text={rep.review.text}
              pseudonym={rep.review.pseudonym}
              authorEmail={rep.review.user.email}
              accountCreated={rep.review.user.createdAt}
              note={`🚩 Report: ${rep.reason}`}
            />
          ))}
          {reported.length === 0 && <p className="text-sm text-stone-500">No open reports.</p>}
        </div>
      </section>
    </div>
  );
}

function ReviewModerationCard(props: {
  reviewId: string;
  businessName: string;
  businessSlug: string;
  rating: number;
  text: string;
  pseudonym: string;
  authorEmail: string;
  accountCreated: Date;
  note: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link
          href={`/business/${props.businessSlug}`}
          className="font-medium text-brand-700 hover:underline"
        >
          {props.businessName}
        </Link>
        <Stars rating={props.rating} size="text-sm" />
        <span className="text-xs text-stone-500">as 🕶️ {props.pseudonym}</span>
      </div>
      <p className="mt-1 text-xs text-amber-800 bg-amber-50 rounded-lg p-2">{props.note}</p>
      <p className="mt-2 text-sm whitespace-pre-wrap">{props.text}</p>
      <p className="mt-2 text-xs text-stone-500">
        Author (admin-only): {props.authorEmail} — account since{" "}
        {props.accountCreated.toLocaleDateString()}
      </p>
      <div className="mt-2 flex gap-2">
        <form action={moderateReview.bind(null, props.reviewId, "clear")}>
          <button className="rounded-lg bg-brand-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-800 cursor-pointer">
            Looks genuine — keep
          </button>
        </form>
        <form action={moderateReview.bind(null, props.reviewId, "hide")}>
          <button className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700 cursor-pointer">
            Fake/abusive — hide
          </button>
        </form>
      </div>
    </div>
  );
}
