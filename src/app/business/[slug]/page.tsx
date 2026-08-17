import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewSnapshot } from "@/components/ReviewSnapshot";
import { buildSnapshot } from "@/lib/snapshot";
import { parseTags, tagLabel } from "@/lib/tags";

export const dynamic = "force-dynamic";

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ posted?: string; flagged?: string }>;
}) {
  const { slug } = await params;
  const { posted, flagged } = await searchParams;
  const user = await getCurrentUser();

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      reviews: {
        where: { status: { not: "HIDDEN" } },
        include: {
          photos: true,
          ownerReply: true,
          helpfulVotes: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!business) notFound();

  const reviews = business.reviews
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      pseudonym: r.pseudonym,
      createdAt: r.createdAt,
      photos: r.photos,
      ownerReply: r.ownerReply,
      helpfulCount: r.helpfulVotes.length,
      viewerVoted: user ? r.helpfulVotes.some((v) => v.userId === user.id) : false,
    }))
    .sort((a, b) => b.helpfulCount - a.helpfulCount || +b.createdAt - +a.createdAt);

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const snapshot = buildSnapshot(reviews);
  const tags = parseTags(business.tags);
  const viewerIsOwner = !!user && business.ownerId === user.id;
  const alreadyReviewed = !!user && business.reviews.some((r) => r.userId === user.id);

  return (
    <div>
      {posted && (
        <div className="mb-4 bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
          <p className="font-medium text-brand-800">✓ Your anonymous review is live.</p>
          {flagged && (
            <p className="mt-1 text-stone-600">
              Heads up: our safeguards flagged it for a quick human check, since patterns around it
              look unusual. It stays visible unless a moderator finds a problem.
            </p>
          )}
        </div>
      )}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {business.category} · {business.city}
            </p>
          </div>
          {business.ownerId ? (
            <span className="text-xs bg-brand-100 text-brand-800 px-2.5 py-1 rounded-full">
              ✓ Owner verified — replies to reviews
            </span>
          ) : (
            <Link
              href={`/business/${business.slug}/claim`}
              className="text-xs text-brand-700 border border-brand-600 px-2.5 py-1 rounded-full hover:bg-brand-50"
            >
              Own this business? Claim it
            </Link>
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs bg-brand-50 border border-brand-100 text-brand-800 px-2.5 py-1 rounded-full"
              >
                {tagLabel(t)}
              </span>
            ))}
          </div>
        )}
        {(business.address || business.hours || business.phone || business.website) && (
          <div className="mt-3 space-y-1 text-sm text-stone-600">
            {business.address && (
              <p>
                📍 {business.address}
                {business.zip ? `, ${business.zip}` : ""}
              </p>
            )}
            {business.hours && <p>🕒 {business.hours}</p>}
            {business.phone && <p>📞 {business.phone}</p>}
            {business.website && (
              <p>
                🌐{" "}
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-brand-700 hover:underline break-all"
                >
                  {business.website.replace(/^https?:\/\//, "")}
                </a>
              </p>
            )}
          </div>
        )}
        {business.description && <p className="mt-3 text-sm text-stone-700">{business.description}</p>}
        <div className="mt-3 flex items-center gap-2">
          {avg !== null ? (
            <>
              <Stars rating={avg} size="text-xl" />
              <span className="text-lg font-semibold">{avg.toFixed(1)}</span>
              <span className="text-sm text-stone-500">
                · {reviews.length} anonymous review{reviews.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-stone-400 text-sm">No reviews yet</span>
          )}
        </div>
      </div>

      {snapshot && (
        <section className="mt-4">
          <ReviewSnapshot data={snapshot} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold text-lg">Write a review</h2>
        <div className="mt-2 bg-white rounded-xl border border-stone-200 p-4">
          {!user ? (
            <p className="text-sm text-stone-600">
              <Link
                href={`/login?next=/business/${business.slug}`}
                className="text-brand-700 font-medium hover:underline"
              >
                Log in
              </Link>{" "}
              to post an anonymous review. Your identity is never shown — accounts only exist to
              keep fake reviews out.
            </p>
          ) : viewerIsOwner ? (
            <p className="text-sm text-stone-600">
              You&apos;re the verified owner — you can reply to reviews below, but not review your
              own business.
            </p>
          ) : alreadyReviewed ? (
            <p className="text-sm text-stone-600">
              You&apos;ve reviewed this business. One review per person keeps ratings honest.
            </p>
          ) : (
            <ReviewForm businessId={business.id} slug={business.slug} />
          )}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-semibold text-lg">
          Reviews {reviews.length > 0 && <span className="text-stone-400">({reviews.length})</span>}
        </h2>
        {reviews.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            slug={business.slug}
            businessName={business.name}
            viewerIsOwner={viewerIsOwner}
            viewerIsLoggedIn={!!user}
          />
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-stone-500">Nothing here yet — be the first to review.</p>
        )}
      </section>
    </div>
  );
}
