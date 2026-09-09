import Link from "next/link";
import { prisma } from "@/lib/db";
import { isTagSlug, parseTags, TAGS } from "@/lib/tags";
import { isStandard, parseStandards } from "@/lib/diet";
import { isOpenAt } from "@/lib/hours";
import { distanceMiles, isRadius, parseLatLng } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { canSpotlight } from "@/lib/membership";
import { BusinessCard } from "@/components/BusinessCard";
import { FilterBar } from "@/components/FilterBar";
import { CategoryTiles } from "@/components/CategoryTiles";
import { ResultRow } from "@/components/ResultRow";
import { ResultsMap } from "@/components/ResultsMap";
import { openStatusLabel } from "@/lib/hours";

export const dynamic = "force-dynamic";

const SORTS = ["recommended", "rating", "reviews", "newest", "recent", "distance"] as const;
type Sort = (typeof SORTS)[number];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tags?: string;
    price?: string;
    open?: string;
    sort?: string;
    view?: string;
    minRating?: string;
    photos?: string;
    near?: string;
    radius?: string;
  }>;
}) {
  const sp = await searchParams;
  const { q, category, view } = sp;
  const user = await getCurrentUser();

  const activeTags = (sp.tags ?? "").split(",").filter((t) => isTagSlug(t) || isStandard(t));
  const prices = (sp.price ?? "")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  const openNow = sp.open === "1";
  const withPhotos = sp.photos === "1";
  const minRating = [2, 3, 3.5, 4, 4.5].includes(Number(sp.minRating)) ? Number(sp.minRating) : 0;
  const origin = parseLatLng(sp.near);
  const radius = isRadius(Number(sp.radius)) ? Number(sp.radius) : 5;
  // Pre-filter in the database to a box around the point, so the row cap
  // below can never drop a place that is actually nearby. Exact distance is
  // still computed per result; the box is just a coarse net.
  const box = origin
    ? {
        lat: { gte: origin.lat - radius / 69, lte: origin.lat + radius / 69 },
        lng: {
          gte: origin.lng - radius / (69 * Math.cos((origin.lat * Math.PI) / 180)),
          lte: origin.lng + radius / (69 * Math.cos((origin.lat * Math.PI) / 180)),
        },
      }
    : {};
  let sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "recommended";
  // Sorting by distance only means anything once we know where "here" is.
  if (sort === "distance" && !origin) sort = "recommended";

  // A search phrase naming a tag ("kosher", "gluten free") matches tagged
  // businesses too, not just name/city/description.
  const qNorm = (q ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const qTagSlugs = TAGS.filter(
    (t) => qNorm.length >= 3 && (t.slug.includes(qNorm) || qNorm.includes(t.slug))
  ).map((t) => t.slug);

  // A signed-in person's own dietary line is applied on top of everything.
  const myStandards = parseStandards(user?.dietStandard ?? "");

  const businesses = await prisma.business.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(prices.length ? { priceLevel: { in: prices } } : {}),
      // A rating floor only makes sense against businesses that have a rating
      // at all — an unreviewed place is not "under 4 stars", it is unknown.
      ...(minRating ? { scoreAvg: { gte: minRating }, scoreCount: { gt: 0 } } : {}),
      ...(withPhotos ? { reviews: { some: { photos: { some: {} } } } } : {}),
      ...box,
      AND: [
        ...activeTags.map((t) => ({ tags: { contains: `,${t},` } })),
        ...myStandards.map((t) => ({ tags: { contains: `,${t},` } })),
      ],
      ...(q
        ? {
            OR: [
              // Postgres LIKE is case-sensitive; SQLite's was not. Keep search
              // behaving the way it always has.
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { zip: { contains: q, mode: "insensitive" } },
              ...qTagSlugs.map((t) => ({ tags: { contains: `,${t},` } })),
            ],
          }
        : {}),
    },
    include: {
      openingHours: true,
      // One cover photo per card: the newest review that has any.
      // Newest counted reviews: the first with a photo supplies the cover,
      // the first with text supplies the one-line excerpt.
      reviews: {
        where: { status: { not: "HIDDEN" }, includedInScore: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { text: true, photos: { take: 1, select: { path: true } } },
      },
    },
    take: 400,
  });

  // Spotlight members get one clearly-labelled sponsored card when someone
  // is browsing their city. Never mixed into organic order, never unlabelled,
  // and the score shown is the same one everyone else sees.
  const cityBrowsed = q || businesses[0]?.city;
  let sponsored: (typeof businesses)[number] | null = null;
  if (businesses.length > 0) {
    const candidates = await prisma.business.findMany({
      where: {
        id: { in: businesses.map((b) => b.id) },
        owner: { isNot: null },
      },
      include: {
        owner: { select: { proUntil: true, proTier: true } },
        openingHours: true,
        reviews: {
          where: { status: { not: "HIDDEN" }, includedInScore: true },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { text: true, photos: { take: 1, select: { path: true } } },
        },
      },
    });
    const spotlit = candidates.filter((b) => canSpotlight(b.owner));
    if (spotlit.length > 0) {
      // rotate hourly between spotlight members rather than always the same one
      sponsored = spotlit[new Date().getHours() % spotlit.length];
    }
  }

  const now = new Date();
  let withStats = businesses
    .filter((b) => !openNow || isOpenAt(b.openingHours, now))
    .map((b) => ({
      ...b,
      isOpen: b.openingHours.length > 0 ? isOpenAt(b.openingHours, now) : null,
      miles:
        origin && b.lat != null && b.lng != null
          ? distanceMiles(origin.lat, origin.lng, b.lat, b.lng)
          : null,
    }))
    // "Near me" hides places we cannot locate rather than guessing at them.
    .filter((b) => !origin || (b.miles !== null && b.miles <= radius));

  withStats.sort((a, b) => {
    if (sort === "rating") return b.scoreAvg - a.scoreAvg || b.scoreCount - a.scoreCount;
    if (sort === "reviews") return b.scoreCount - a.scoreCount;
    if (sort === "newest") return +b.createdAt - +a.createdAt;
    if (sort === "recent") {
      return (+(b.lastReviewedAt ?? 0)) - (+(a.lastReviewedAt ?? 0));
    }
    if (sort === "distance") return (a.miles ?? Infinity) - (b.miles ?? Infinity);
    // "Recommended" blends score and how much evidence backs it.
    const rank = (x: typeof a) => x.scoreAvg * Math.log10(x.scoreCount + 2);
    return rank(b) - rank(a);
  });
  withStats = withStats.slice(0, 60);

  // Where "here" is: the city most of the results are in (or the one being
  // browsed). Shown beside the search so nobody has to infer it from cards.
  const cityCounts = new Map<string, number>();
  for (const b of withStats) cityCounts.set(b.city, (cityCounts.get(b.city) ?? 0) + 1);
  // Name a city only when one clearly dominates the results; a spread across
  // many cities is the region, not whichever town happens to have the most rows.
  const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const placeName =
    category || q
      ? (topCity?.[0] ?? q ?? "South Florida")
      : topCity && topCity[1] / Math.max(1, withStats.length) >= 0.6
        ? topCity[0]
        : "South Florida";
  const anyRated = withStats.some((b) => b.scoreCount > 0);
  // A discovery row that rotates across categories, rated places first, so
  // the top of the page shows the breadth of the city rather than whichever
  // category happened to import last.
  const byCategory = new Map<string, typeof withStats>();
  for (const b of [...withStats].sort((a, b) => b.scoreCount - a.scoreCount || a.name.localeCompare(b.name))) {
    byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b]);
  }
  const worthALook: typeof withStats = [];
  const buckets = [...byCategory.values()];
  for (let i = 0; worthALook.length < 8 && buckets.some((x) => x.length > i); i++) {
    for (const bucket of buckets) if (bucket[i] && worthALook.length < 8) worthALook.push(bucket[i]);
  }
  const openNowList = withStats.filter((b) => b.isOpen).slice(0, 8);
  const filtering = Boolean(
    q || category || activeTags.length || prices.length || openNow || minRating || withPhotos || origin ||
    sort !== "recommended"
  );

  const heading =
    view === "trending"
      ? "Trending this month"
      : view === "gems"
        ? "Hidden gems"
        : view === "top"
          ? "Top rated"
          : null;

  return (
    <div>
      {/* Hero: a dark band gives the top of the page weight and contrast.
          One headline, the search and where you are — nothing else. */}
      <section className="relative left-1/2 -ml-[50vw] w-screen -mt-6 px-4 sm:px-6 pt-8 pb-8 sm:pt-14 sm:pb-12 bg-brand-900 text-white overflow-hidden">
        {/* Warm evening light rather than a cold gradient; replaced by a
            photograph once image credentials are configured. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(1100px 520px at 82% -20%, rgba(244,113,28,0.45), transparent 62%), radial-gradient(700px 360px at 4% 115%, rgba(249,230,205,0.14), transparent 60%), radial-gradient(600px 300px at 55% 125%, rgba(244,113,28,0.18), transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="font-display text-[34px] sm:text-[58px] leading-[1.02]">
            Find places <span className="text-star">worth</span> your time.
          </h1>
          <p className="hidden sm:block text-white/75 text-lg mt-3">
            Real people. Honest reviews. Every kind of business, all across America.
          </p>
          <form action="/" className="mt-5 sm:mt-7 flex gap-2">
            <label className="flex-1 min-w-0 flex items-center gap-2.5 rounded-xl bg-white pl-3.5 pr-2 h-12 sm:h-13 shadow-lg shadow-black/20 focus-within:ring-2 focus-within:ring-star">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search places or food"
                className="flex-1 min-w-0 h-full bg-transparent text-[15px] sm:text-base text-stone-900 focus:outline-none"
              />
              <span className="hidden sm:inline-flex items-center gap-1 text-[12.5px] font-semibold text-stone-600 bg-stone-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></svg>
                {placeName}
              </span>
            </label>
            <button className="shrink-0 rounded-xl bg-brand-600 text-white px-4 sm:px-6 h-12 sm:h-13 font-semibold hover:bg-brand-700 cursor-pointer">
              Search
            </button>
          </form>
          <p className="sm:hidden mt-2 text-[12.5px] text-white/60 inline-flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></svg>
            {placeName}
          </p>
        </div>
      </section>

      {/* Category row on its own white band, the way Yelp and TripAdvisor
          put browse tabs under the search rather than inside the hero. */}
      <div className="relative left-1/2 -ml-[50vw] w-screen bg-white border-b border-line mb-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CategoryTiles active={category} q={q} />
        </div>
      </div>

      {myStandards.length > 0 && (
        <p className="mb-2 text-xs text-brand-800 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
          Filtered to your dietary standard.{" "}
          <Link href="/account" className="underline">
            Change it
          </Link>
        </p>
      )}

      {/* Why this site is different, right under the search — before any
          filtering or results, where a first-time visitor actually reads. */}
      {!filtering && !heading && (
        <section className="mb-6 grid gap-2 sm:gap-3 sm:grid-cols-3">
          {[
            ["100% anonymous", "Your pen name is all anyone sees — businesses included."],
            ["Owners can reply, not retaliate", "They answer in public and never learn who you are."],
            ["Money never moves a rating", "Paying businesses get tools, not better scores. Ever."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl sm:rounded-2xl bg-brand-50 border border-brand-100 px-3.5 py-2.5 sm:px-4 sm:py-3.5">
              <p className="font-semibold text-[14px] sm:text-[14.5px] text-brand-800">{t}</p>
              <p className="hidden sm:block text-[13px] text-stone-600 mt-0.5">{d}</p>
            </div>
          ))}
        </section>
      )}

      <FilterBar
        q={q}
        category={category}
        activeTags={activeTags}
        prices={prices}
        openNow={openNow}
        sort={sort}
        minRating={minRating}
        withPhotos={withPhotos}
        near={origin ? `${origin.lat},${origin.lng}` : ""}
        radius={radius}
      />

      {/* Discovery rows only when nobody is filtering; a filtered search goes
          straight to its results. */}
      {!filtering && !heading && (
        <>
          {openNowList.length >= 3 && (
            <Row title="Open right now" items={openNowList} />
          )}
          {worthALook.length >= 3 && (
            <Row title="Worth a look" items={worthALook} />
          )}
        </>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-xl sm:text-[22px] font-bold tracking-tight">
          {heading ??
            (q
              ? `Results for “${q}”`
              : category
                ? category
                : anyRated
                  ? "Popular places"
                  : "Places to explore")}
        </h2>
        <span className="text-sm text-stone-500">{withStats.length} place{withStats.length === 1 ? "" : "s"}</span>
      </div>
      {sponsored && (
        <div className="mt-4 relative">
          <span className="absolute -top-2 left-3 z-10 text-[10px] font-semibold uppercase tracking-wider bg-star text-brand-900 px-2 py-0.5 rounded-full">
            Sponsored
          </span>
          <BusinessCard
            slug={sponsored.slug}
            name={sponsored.name}
            category={sponsored.category}
            city={sponsored.city}
            avgRating={sponsored.scoreCount > 0 ? sponsored.scoreAvg : null}
            reviewCount={sponsored.scoreCount}
            verifiedOwner={true}
            tags={parseTags(sponsored.tags)}
            priceLevel={sponsored.priceLevel}
            photo={sponsored.reviews.find((r) => r.photos[0])?.photos[0]?.path ?? null}
          />
        </div>
      )}

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start">
        <section>
          {withStats.map((b, i) => (
            <ResultRow
              key={b.id}
              index={i + 1}
              slug={b.slug}
              name={b.name}
              category={b.category}
              cuisine={b.cuisine}
              city={b.city}
              address={b.address}
              avgRating={b.scoreCount > 0 ? b.scoreAvg : null}
              reviewCount={b.scoreCount}
              verifiedOwner={!!b.ownerId}
              tags={parseTags(b.tags)}
              priceLevel={b.priceLevel}
              openLabel={b.openingHours.length > 0 ? openStatusLabel(b.openingHours, now) : null}
              cityRank={b.cityRank}
              cityRankSize={b.cityRankSize}
              lastReviewedAt={b.lastReviewedAt}
              miles={b.miles}
              photo={b.reviews.find((r) => r.photos[0])?.photos[0]?.path ?? null}
              excerpt={b.reviews.find((r) => r.text)?.text ?? null}
            />
          ))}
          {withStats.length === 0 && (
            <div className="text-center py-12 text-stone-500">
              <p>No businesses found{q ? ` for “${q}”` : ""}.</p>
              <Link href="/add-business" className="text-brand-700 font-medium hover:underline">
                Add it to True Review →
              </Link>
            </div>
          )}
        </section>
        <aside className="hidden lg:block sticky top-20">
          <ResultsMap
            pins={withStats
              .filter((b) => b.lat != null && b.lng != null)
              .slice(0, 60)
              .map((b, i) => ({ n: i + 1, slug: b.slug, name: b.name, lat: b.lat as number, lng: b.lng as number }))}
          />
        </aside>
      </div>
    </div>
  );
}


type CardBusiness = {
  id: string; slug: string; name: string; category: string; city: string;
  scoreAvg: number; scoreCount: number; ownerId: string | null; tags: string;
  priceLevel: number; isOpen: boolean | null; cityRank: number; cityRankSize: number;
  lastReviewedAt: Date | null; miles: number | null;
  reviews: { text: string; photos: { path: string }[] }[];
};

function cardProps(b: CardBusiness) {
  return {
    slug: b.slug, name: b.name, category: b.category, city: b.city,
    avgRating: b.scoreCount > 0 ? b.scoreAvg : null, reviewCount: b.scoreCount,
    verifiedOwner: !!b.ownerId, tags: parseTags(b.tags), priceLevel: b.priceLevel,
    isOpen: b.isOpen, cityRank: b.cityRank, cityRankSize: b.cityRankSize,
    lastReviewedAt: b.lastReviewedAt, miles: b.miles,
    photo: b.reviews.find((r) => r.photos[0])?.photos[0]?.path ?? null,
  };
}

/** Compact row on phones when there is no photo; full card otherwise.
 *  One element, reshaped by breakpoint — never two links for one place. */
function ResponsiveCard(props: React.ComponentProps<typeof BusinessCard>) {
  return <BusinessCard {...props} variant={props.photo ? "card" : "auto"} />;
}

/** A horizontally scrolling discovery row. */
function Row({ title, items }: { title: string; items: CardBusiness[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl sm:text-[22px] font-bold tracking-tight mb-3">{title}</h2>
      <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 sm:gap-4 min-w-max">
          {items.map((b) => (
            <div key={b.id} className="w-[240px] sm:w-[280px] shrink-0">
              <BusinessCard {...cardProps(b)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
