import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { reviewerStats } from "@/lib/badges";
import { BadgeRow } from "@/components/Badges";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

// A reviewer's public record. Everything here is earned under the pen name —
// nothing on this page can identify the person behind it.
export default async function ReviewerPage({
  params,
}: {
  params: Promise<{ pseudonym: string }>;
}) {
  const { pseudonym } = await params;
  const name = decodeURIComponent(pseudonym);

  // Accounts created before pen names were stored on the user still carry
  // theirs on each review, so fall back to that rather than 404ing.
  let user = await prisma.user.findFirst({
    where: { pseudonym: name },
    select: { id: true, pseudonym: true, isBanned: true },
  });
  if (!user) {
    const viaReview = await prisma.review.findFirst({
      where: { pseudonym: name, status: { not: "HIDDEN" } },
      select: { user: { select: { id: true, pseudonym: true, isBanned: true } } },
    });
    user = viaReview?.user ?? null;
  }
  if (!user || user.isBanned) notFound();
  const penName = user.pseudonym ?? name;

  const [stats, reviews] = await Promise.all([
    reviewerStats(user.id),
    prisma.review.findMany({
      where: { userId: user.id, status: { not: "HIDDEN" } },
      include: { business: true, helpfulVotes: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!stats) notFound();

  const years = Math.max(
    0,
    Math.floor((Date.now() - stats.memberSince.getTime()) / (1000 * 60 * 60 * 24 * 365))
  );

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Browse all
      </Link>

      <div className="mt-2 bg-white rounded-xl border border-stone-200 p-5">
        <h1 className="text-2xl font-bold">🕶️ {penName}</h1>
        <p className="text-sm text-stone-600 mt-1">
          A pen name. Everything below was earned under it — who this is stays hidden from
          businesses, from other readers, and from search engines.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "reviews", value: stats.reviews },
            { label: "found helpful", value: stats.helpfulVotes },
            { label: "badges", value: stats.earned.length },
          ].map((s) => (
            <div key={s.label} className="bg-stone-50 rounded-lg border border-stone-200 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-stone-600">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Reviewing since {stats.memberSince.getFullYear()}
          {years >= 1 ? ` · ${years} year${years === 1 ? "" : "s"}` : ""}
        </p>

        {stats.earned.length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <BadgeRow badges={stats.earned} />
          </div>
        )}
      </div>

      <h2 className="font-semibold text-lg mt-6">Their reviews</h2>
      <div className="mt-2 space-y-2">
        {reviews.map((r) => (
          <Link
            key={r.id}
            href={`/business/${r.business.slug}`}
            className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-brand-600"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{r.business.name}</span>
              <span className="flex items-center gap-1.5">
                <Stars rating={r.rating} size="text-sm" />
                <span className="text-xs text-stone-600">{r.rating.toFixed(1)}</span>
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-700 line-clamp-2">{r.text}</p>
            <p className="mt-1 text-xs text-stone-500">
              {r.createdAt.toLocaleDateString()}
              {r.helpfulVotes.length > 0 && ` · 👍 ${r.helpfulVotes.length}`}
            </p>
          </Link>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-stone-500">No public reviews yet.</p>
        )}
      </div>
    </div>
  );
}
