import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import { ReviewSnapshot } from "@/components/ReviewSnapshot";
import { SaveButtons } from "@/components/SaveButtons";
import { AddToList } from "@/components/AddToList";
import { DietPanel, type DietClaim } from "@/components/DietPanel";
import { buildSnapshot } from "@/lib/snapshot";
import { parseTags, tagLabel } from "@/lib/tags";
import { parseStandards, freshnessOf, standardLabel } from "@/lib/diet";
import { isThin, plainAverage } from "@/lib/rating";
import { groupByDay, openStatusLabel, minutesToLabel, DAY_SHORT, PRICE_LABELS } from "@/lib/hours";

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
      openingHours: true,
      reviews: {
        where: { status: { not: "HIDDEN" } },
        include: { photos: true, ownerReply: true, helpfulVotes: true, flags: true },
        orderBy: { createdAt: "desc" },
      },
      confirmations: true,
    },
  });
  if (!business) notFound();

  const reviews = business.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    loved: r.loved,
    quickTags: r.quickTags,
    text: r.text,
    pseudonym: r.pseudonym,
    createdAt: r.createdAt,
    photos: r.photos,
    ownerReply: r.ownerReply,
    helpfulCount: r.helpfulVotes.length,
    viewerVoted: user ? r.helpfulVotes.some((v) => v.userId === user.id) : false,
    includedInScore: r.includedInScore,
    excludeReason: r.excludeReason,
    disputed: r.flags.length > 0,
  }));

  const scored = reviews.filter((r) => r.includedInScore);
  const snapshot = buildSnapshot(scored);
  const rawAvg = plainAverage(scored);
  const lovedCount = scored.filter((r) => r.loved).length;

  const tags = parseTags(business.tags);
  const standards = parseStandards(business.tags);

  // Latest confirmation per dietary claim, so the page can say how fresh it is.
  const claims: DietClaim[] = standards.map((tag) => {
    const forTag = business.confirmations.filter((c) => c.tag === tag);
    const latest = forTag
      .filter((c) => c.stillTrue)
      .sort((a, b) => +b.createdAt - +a.createdAt)[0];
    return {
      tag,
      lastConfirmed: latest ? latest.createdAt.toISOString() : null,
      freshness: freshnessOf(latest ? latest.createdAt : null),
      confirms: forTag.filter((c) => c.stillTrue).length,
      disputes: forTag.filter((c) => !c.stillTrue).length,
    };
  });

  const [saves, myLists] = await Promise.all([
    user
      ? prisma.save.findMany({ where: { userId: user.id, businessId: business.id } })
      : Promise.resolve([]),
    user
      ? prisma.userList.findMany({
          where: { userId: user.id },
          include: { items: { where: { businessId: business.id }, select: { id: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const hoursSpans = business.openingHours;

  const viewerIsOwner = !!user && business.ownerId === user.id;
  const alreadyReviewed = !!user && business.reviews.some((r) => r.userId === user.id);
  const openStatus = openStatusLabel(hoursSpans);
  const grouped = groupByDay(hoursSpans);

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
              {business.priceLevel > 0 && ` · ${PRICE_LABELS[business.priceLevel]}`}
            </p>
            {business.cityRank > 0 && (
              <p className="text-sm text-brand-700 font-medium mt-1">
                #{business.cityRank} of {business.cityRankSize} {business.category.toLowerCase()} in{" "}
                {business.city}
              </p>
            )}
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

        {(business.address || openStatus || business.phone || business.website) && (
          <div className="mt-3 space-y-1 text-sm text-stone-600">
            {business.address && (
              <p>
                📍 {business.address}
                {business.zip ? `, ${business.zip}` : ""}
              </p>
            )}
            {openStatus && (
              <p>
                🕒{" "}
                <span
                  className={
                    openStatus.startsWith("Closed") ? "text-stone-500" : "text-brand-700 font-medium"
                  }
                >
                  {openStatus}
                </span>
              </p>
            )}
            {!openStatus && business.hours && <p>🕒 {business.hours}</p>}
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

        {hoursSpans.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-brand-700 hover:underline text-xs">
              All opening hours
            </summary>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 max-w-xs text-xs text-stone-600">
              {grouped.map((g) => (
                <div key={g.day} className="contents">
                  <span className="font-medium">{DAY_SHORT[g.day]}</span>
                  <span>
                    {g.spans.length === 0
                      ? "Closed"
                      : g.spans
                          .map((s) => `${minutesToLabel(s.openMin)}–${minutesToLabel(s.closeMin)}`)
                          .join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        <DietPanel
          businessId={business.id}
          claims={claims}
          canConfirm={!!user?.emailVerifiedAt}
          certifier={business.certifier}
        />

        {business.description && (
          <p className="mt-3 text-sm text-stone-700">{business.description}</p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {business.scoreCount > 0 ? (
            <>
              <Stars rating={business.scoreAvg} size="text-xl" />
              <span className="text-lg font-semibold">{business.scoreAvg.toFixed(1)}</span>
              <span className="text-sm text-stone-500">
                · {business.scoreCount} review{business.scoreCount !== 1 ? "s" : ""}
              </span>
              {lovedCount > 0 && (
                <span className="text-sm text-rose-600">· ♥ {lovedCount}</span>
              )}
            </>
          ) : (
            <span className="text-stone-400 text-sm">No reviews yet</span>
          )}
        </div>
        {business.scoreCount > 0 && isThin(business.scoreCount) && (
          <p className="mt-1 text-xs text-stone-500">
            Too few reviews for a settled score yet — it will move as more arrive.
            {rawAvg !== null && ` Straight average so far: ${rawAvg.toFixed(1)}.`}
          </p>
        )}
        {business.scoreFrozen && (
          <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ Unusual review activity detected here recently. The score is on hold while a
            moderator looks — the reviews below are all still readable.
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <SaveButtons
            businessId={business.id}
            want={saves.some((s) => s.kind === "WANT")}
            been={saves.some((s) => s.kind === "BEEN")}
            loggedIn={!!user}
          />
          <AddToList
            businessId={business.id}
            lists={myLists.map((l) => ({ id: l.id, title: l.title, has: l.items.length > 0 }))}
          />
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

      <section className="mt-6">
        <h2 className="font-semibold text-lg mb-2">
          Reviews {reviews.length > 0 && <span className="text-stone-400">({reviews.length})</span>}
        </h2>
        <ReviewList
          reviews={reviews}
          slug={business.slug}
          businessName={business.name}
          viewerIsOwner={viewerIsOwner}
          viewerIsLoggedIn={!!user}
          topics={snapshot?.mentions ?? []}
        />
      </section>
    </div>
  );
}
