import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { ReviewForm } from "@/components/ReviewForm";
import { categoryArt } from "@/lib/categoryArt";
import { ResultsMap } from "@/components/ResultsMap";
import { ReviewList } from "@/components/ReviewList";
import { ReviewSnapshot } from "@/components/ReviewSnapshot";
import { SaveButtons } from "@/components/SaveButtons";
import { AddToList } from "@/components/AddToList";
import { DietPanel, type DietClaim } from "@/components/DietPanel";
import { buildSnapshot } from "@/lib/snapshot";
import { parseTags, tagLabel } from "@/lib/tags";
import { parseStandards, freshnessOf } from "@/lib/diet";
import { isFoodCategory } from "@/lib/categories";
import { isThin, plainAverage } from "@/lib/rating";
import { groupByDay, openStatusLabel, minutesToLabel, DAY_SHORT, PRICE_LABELS } from "@/lib/hours";

export const dynamic = "force-dynamic";

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ posted?: string; flagged?: string; invite?: string }>;
}) {
  const { slug } = await params;
  const { posted, flagged, invite } = await searchParams;
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

  // One grouped query for every author on this page, so the trust cue beside
  // each pen name doesn't cost a query per review.
  const authorCounts = new Map(
    (
      await prisma.review.groupBy({
        by: ["userId"],
        where: {
          userId: { in: [...new Set(business.reviews.map((r) => r.userId))] },
          status: { not: "HIDDEN" },
        },
        _count: { _all: true },
      })
    ).map((g) => [g.userId, g._count._all])
  );

  const reviews = business.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    loved: r.loved,
    quickTags: r.quickTags,
    viaInvite: r.viaInvite,
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
    authorReviews: authorCounts.get(r.userId) ?? 1,
  }));

  const scored = reviews.filter((r) => r.includedInScore);
  const snapshot = buildSnapshot(scored);
  const rawAvg = plainAverage(scored);
  const lovedCount = scored.filter((r) => r.loved).length;

  const tags = parseTags(business.tags);
  // Dietary claims only apply to places that serve food.
  const standards = isFoodCategory(business.category) ? parseStandards(business.tags) : [];

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

      {/* Gallery hero: review photos when there are any, a category-tinted
          band when there are none. Photos are what make a listing feel real. */}
      {(() => {
        const photos = reviews.flatMap((r) => r.photos.map((p) => p.path)).slice(0, 5);
        const art = categoryArt(business.category);
        if (photos.length === 0) {
          return (
            <div
              className="relative h-40 sm:h-52 rounded-card overflow-hidden"
              style={{ background: `linear-gradient(120deg, ${art.tint} 0%, ${art.pop} 150%)`, color: art.ink }}
            >
              <span className="absolute -right-4 -bottom-16 font-display text-[240px] sm:text-[300px] leading-none select-none" style={{ opacity: 0.14 }} aria-hidden="true">
                {business.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="absolute left-5 bottom-5 flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-white/85 shadow-sm flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={art.icon} /></svg>
                </span>
                <span className="text-[13px] font-semibold bg-white/85 rounded-full px-3 py-1.5 shadow-sm">No photos yet — add the first</span>
              </div>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-56 sm:h-80 rounded-card overflow-hidden">
            {photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className={`w-full h-full object-cover ${i === 0 ? "col-span-2 row-span-2" : ""} ${
                  photos.length === 1 ? "col-span-4 row-span-2" : ""
                }`}
              />
            ))}
          </div>
        );
      })()}

      <div className="bg-white rounded-card border border-line p-5 sm:p-6 mt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-semibold text-3xl sm:text-[40px] leading-tight">{business.name}</h1>
            <p className="text-[15px] text-stone-600 mt-1.5">
              {[business.priceLevel > 0 ? PRICE_LABELS[business.priceLevel] : null, business.cuisine || business.category, business.city]
                .filter(Boolean)
                .join(" · ")}
              {openStatus && (
                <span className={`ml-2 font-semibold ${openStatus.startsWith("Closed") ? "text-red-600" : "text-emerald-700"}`}>
                  {openStatus}
                </span>
              )}
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

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <a href="#write-review" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#f5a524"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z" /></svg>
            Write a review
          </a>
          {business.phone && (
            <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium hover:border-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
              Call
            </a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium hover:border-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
              Website
            </a>
          )}
          {business.lat != null && business.lng != null && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium hover:border-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></svg>
              Directions
            </a>
          )}
        </div>


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
            <span className="text-stone-500 text-sm">No reviews yet — been here? You&apos;d be the first.</span>
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

      {(business.address || hoursSpans.length > 0 || (business.lat != null && business.lng != null)) && (
        <section className="mt-6 bg-white rounded-card border border-line p-5 sm:p-6">
          <h2 className="font-display text-xl">Location &amp; Hours</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              {business.lat != null && business.lng != null && (
                <div className="h-56 rounded-xl overflow-hidden border border-line">
                  <ResultsMap pins={[{ n: 1, slug: business.slug, name: business.name, lat: business.lat, lng: business.lng }]} compact />
                </div>
              )}
              {business.address && (
                <p className="mt-3 text-[15px]">
                  <span className="font-medium">{business.address}</span>
                  <span className="text-stone-500">, {business.city}{business.zip ? ` ${business.zip}` : ""}</span>
                </p>
              )}
              {!business.address && <p className="mt-3 text-[15px] text-stone-500">{business.city}</p>}
            </div>
            <div>
              {hoursSpans.length > 0 ? (
                <table className="w-full text-[14.5px]">
                  <tbody>
                    {grouped.map((g) => {
                      const today = new Date().getDay() === g.day;
                      return (
                        <tr key={g.day} className={today ? "font-semibold" : ""}>
                          <td className="py-1 pr-4 w-16 text-stone-700">{DAY_SHORT[g.day]}</td>
                          <td className="py-1 text-stone-800">
                            {g.spans.length === 0
                              ? "Closed"
                              : g.spans.map((sp) => `${minutesToLabel(sp.openMin)} – ${minutesToLabel(sp.closeMin)}`).join(", ")}
                            {today && openStatus && (
                              <span className={`ml-2 text-[13px] ${openStatus.startsWith("Closed") ? "text-red-600" : "text-emerald-700"}`}>{openStatus}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : business.hours ? (
                <p className="text-[14.5px] text-stone-700">{business.hours}</p>
              ) : (
                <p className="text-[14.5px] text-stone-500">
                  Hours not listed yet.{" "}
                  {business.ownerId ? "" : (
                    <Link href={`/business/${business.slug}/claim`} className="text-brand-700 hover:underline">Own this place? Add them.</Link>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section className="mt-6 bg-white rounded-card border border-line p-5 sm:p-6">
          <h2 className="font-display text-xl">Amenities &amp; More</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-[14.5px]">
            {tags.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                </span>
                {tagLabel(t)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="write-review" className="mt-6">
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
            <ReviewForm businessId={business.id} slug={business.slug} invite={invite} />
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
