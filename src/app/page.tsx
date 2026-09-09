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
      reviews: {
        where: { status: { not: "HIDDEN" }, photos: { some: {} } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { photos: { take: 1, select: { path: true } } },
      },
    },
    take: 200,
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
          where: { status: { not: "HIDDEN" }, photos: { some: {} } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { photos: { take: 1, select: { path: true } } },
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
      <section className="text-center pt-8 pb-6 sm:pt-12 sm:pb-8">
        <h1 className="font-display font-semibold text-[38px] sm:text-[56px] leading-[1.05] tracking-tight">
          Find places worth your time.
        </h1>
        <p className="text-stone-500 text-lg sm:text-xl mt-3">
          Reviewed by the people, for the people.
        </p>
        <form action="/" className="mt-7 flex max-w-2xl mx-auto gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-2.5 rounded-xl border border-stone-300 bg-white pl-4 pr-2 h-13 shadow-sm focus-within:ring-2 focus-within:ring-brand-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Try “kosher pizza”, a name, or a city…"
              className="flex-1 min-w-0 h-full bg-transparent text-base focus:outline-none"
            />
          </label>
          <button className="shrink-0 rounded-xl bg-brand-600 text-white px-4 sm:px-6 h-13 font-semibold hover:bg-brand-700 cursor-pointer">
            Search
          </button>
        </form>
        <div className="mt-3 flex justify-center gap-3 flex-wrap text-sm text-stone-500">
          <Link href="/collections/trending" className="hover:text-brand-700">Trending</Link>
          <span className="text-stone-300">·</span>
          <Link href="/collections/top" className="hover:text-brand-700">Top rated</Link>
          <span className="text-stone-300">·</span>
          <Link href="/collections/gems" className="hover:text-brand-700">Hidden gems</Link>
          <span className="text-stone-300">·</span>
          <Link href="/surprise" className="hover:text-brand-700">Surprise me</Link>
        </div>
      </section>

      <CategoryTiles active={category} q={q} />

      {myStandards.length > 0 && (
        <p className="mb-2 text-xs text-brand-800 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
          Filtered to your dietary standard.{" "}
          <Link href="/account" className="underline">
            Change it
          </Link>
        </p>
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

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-display font-semibold text-2xl">
          {heading ?? (q ? `Results for “${q}”` : category ? category : "Popular right now")}
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
            photo={sponsored.reviews[0]?.photos[0]?.path ?? null}
          />
        </div>
      )}

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withStats.map((b) => (
          <BusinessCard
            key={b.id}
            slug={b.slug}
            name={b.name}
            category={b.category}
            city={b.city}
            avgRating={b.scoreCount > 0 ? b.scoreAvg : null}
            reviewCount={b.scoreCount}
            verifiedOwner={!!b.ownerId}
            tags={parseTags(b.tags)}
            priceLevel={b.priceLevel}
            isOpen={b.isOpen}
            cityRank={b.cityRank}
            cityRankSize={b.cityRankSize}
            lastReviewedAt={b.lastReviewedAt}
            miles={b.miles}
            photo={b.reviews[0]?.photos[0]?.path ?? null}
          />
        ))}
        {withStats.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-stone-500">
            <p>No businesses found{q ? ` for “${q}”` : ""}.</p>
            <Link href="/add-business" className="text-brand-700 font-medium hover:underline">
              Add it to True Review →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
