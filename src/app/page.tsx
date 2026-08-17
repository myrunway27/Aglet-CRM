import Link from "next/link";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { TAGS, isTagSlug, parseTags } from "@/lib/tags";
import { BusinessCard } from "@/components/BusinessCard";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tags?: string }>;
}) {
  const { q, category, tags } = await searchParams;
  const activeTags = (tags ?? "").split(",").filter(isTagSlug);

  // A search phrase that names a tag ("kosher", "gluten free") matches
  // tagged businesses too, not just name/city/description.
  const qNorm = (q ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const qTagSlugs = TAGS.filter(
    (t) => qNorm.length >= 3 && (t.slug.includes(qNorm) || qNorm.includes(t.slug))
  ).map((t) => t.slug);

  const businesses = await prisma.business.findMany({
    where: {
      ...(category ? { category } : {}),
      AND: activeTags.map((t) => ({ tags: { contains: `,${t},` } })),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { city: { contains: q } },
              { description: { contains: q } },
              ...qTagSlugs.map((t) => ({ tags: { contains: `,${t},` } })),
            ],
          }
        : {}),
    },
    include: {
      reviews: { where: { status: { not: "HIDDEN" } }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const withStats = businesses
    .map((b) => ({
      ...b,
      reviewCount: b.reviews.length,
      avgRating:
        b.reviews.length > 0
          ? b.reviews.reduce((sum, r) => sum + r.rating, 0) / b.reviews.length
          : null,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);

  return (
    <div>
      <section className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Find great places. <span className="text-brand-600">Review them freely.</span>
        </h1>
        <p className="mt-2 text-stone-600 max-w-xl mx-auto">
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
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <Link
          href={activeTags.length ? `/?tags=${activeTags.join(",")}` : "/"}
          className={`shrink-0 text-sm px-3 py-1.5 rounded-full border ${
            !category
              ? "bg-brand-700 text-white border-brand-700"
              : "bg-white border-stone-300 hover:border-brand-600"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/?category=${encodeURIComponent(c)}${
              activeTags.length ? `&tags=${activeTags.join(",")}` : ""
            }`}
            className={`shrink-0 text-sm px-3 py-1.5 rounded-full border ${
              category === c
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white border-stone-300 hover:border-brand-600"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
        {TAGS.map((t) => {
          const active = activeTags.includes(t.slug);
          const nextTags = active
            ? activeTags.filter((x) => x !== t.slug)
            : [...activeTags, t.slug];
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (category) params.set("category", category);
          if (nextTags.length) params.set("tags", nextTags.join(","));
          const qs = params.toString();
          return (
            <Link
              key={t.slug}
              href={qs ? `/?${qs}` : "/"}
              className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full border ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
              }`}
            >
              {active ? "✓ " : ""}
              {t.label}
            </Link>
          );
        })}
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {withStats.map((b) => (
          <BusinessCard
            key={b.id}
            slug={b.slug}
            name={b.name}
            category={b.category}
            city={b.city}
            avgRating={b.avgRating}
            reviewCount={b.reviewCount}
            verifiedOwner={!!b.ownerId}
            tags={parseTags(b.tags)}
          />
        ))}
        {withStats.length === 0 && (
          <div className="sm:col-span-2 text-center py-12 text-stone-500">
            <p>No businesses found{q ? ` for “${q}”` : ""}.</p>
            <Link href="/add-business" className="text-brand-700 font-medium hover:underline">
              Add it to The True Review →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
