import Link from "next/link";
import { prisma } from "@/lib/db";
import { isTagSlug, parseTags, TAGS } from "@/lib/tags";
import { isStandard, parseStandards } from "@/lib/diet";
import { isOpenAt } from "@/lib/hours";
import { getCurrentUser } from "@/lib/auth";
import { BusinessCard } from "@/components/BusinessCard";
import { FilterBar } from "@/components/FilterBar";

export const dynamic = "force-dynamic";

const SORTS = ["recommended", "rating", "reviews", "newest"] as const;
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
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "recommended";

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
      AND: [
        ...activeTags.map((t) => ({ tags: { contains: `,${t},` } })),
        ...myStandards.map((t) => ({ tags: { contains: `,${t},` } })),
      ],
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { city: { contains: q } },
              { description: { contains: q } },
              { address: { contains: q } },
              { zip: { contains: q } },
              ...qTagSlugs.map((t) => ({ tags: { contains: `,${t},` } })),
            ],
          }
        : {}),
    },
    include: { openingHours: true },
    take: 200,
  });

  const now = new Date();
  let withStats = businesses
    .filter((b) => !openNow || isOpenAt(b.openingHours, now))
    .map((b) => ({
      ...b,
      isOpen: b.openingHours.length > 0 ? isOpenAt(b.openingHours, now) : null,
    }));

  withStats.sort((a, b) => {
    if (sort === "rating") return b.scoreAvg - a.scoreAvg || b.scoreCount - a.scoreCount;
    if (sort === "reviews") return b.scoreCount - a.scoreCount;
    if (sort === "newest") return +b.createdAt - +a.createdAt;
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
      <section className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Find great places. <span className="text-brand-600">Review them freely.</span>
        </h1>
        <p className="mt-2 text-brand-700 font-medium">Reviewed by the people, for the people.</p>
        <p className="mt-1 text-stone-600 max-w-xl mx-auto">
          Honest, 100% anonymous reviews of restaurants, cafes and every kind of business. Owners
          can reply — but they never see who you are.
        </p>
        <form action="/" className="mt-6 flex max-w-xl mx-auto gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Try “kosher pizza”, “vegan cafe”, a name or a city…"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <button className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 cursor-pointer">
            Search
          </button>
        </form>
        <div className="mt-3 flex justify-center gap-2 flex-wrap text-sm">
          <Link href="/collections/trending" className="text-brand-700 hover:underline">
            🔥 Trending
          </Link>
          <span className="text-stone-300">·</span>
          <Link href="/collections/top" className="text-brand-700 hover:underline">
            🏆 Top rated
          </Link>
          <span className="text-stone-300">·</span>
          <Link href="/collections/gems" className="text-brand-700 hover:underline">
            💎 Hidden gems
          </Link>
          <span className="text-stone-300">·</span>
          <Link href="/surprise" className="text-brand-700 font-medium hover:underline">
            🎲 Surprise me
          </Link>
        </div>
      </section>

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
      />

      {heading && <h2 className="mt-5 font-semibold text-lg">{heading}</h2>}

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
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
          />
        ))}
        {withStats.length === 0 && (
          <div className="sm:col-span-2 text-center py-12 text-stone-500">
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
