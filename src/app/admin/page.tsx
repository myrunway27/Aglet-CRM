import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decideClaim, moderateReview } from "@/actions/admin";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  const [claims, flagged, reported] = await Promise.all([
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
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mt-4">Moderation</h1>
      <p className="text-sm text-stone-600 mt-1">
        Only admins see this page — including the real accounts behind reviews, which stay hidden
        everywhere else.
      </p>

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
