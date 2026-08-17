import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/tags";
import { BusinessCard } from "@/components/BusinessCard";

export const dynamic = "force-dynamic";

const KINDS = {
  trending: {
    title: "Trending this month",
    blurb: "Places picking up reviews faster than usual right now.",
    icon: "🔥",
  },
  top: {
    title: "Top rated",
    blurb: "Consistently well reviewed, with enough reviews to be sure.",
    icon: "🏆",
  },
  gems: {
    title: "Hidden gems",
    blurb: "Highly rated but barely reviewed — the places a ratings list would bury.",
    icon: "💎",
  },
} as const;

export default async function CollectionPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const meta = KINDS[kind as keyof typeof KINDS];
  if (!meta) notFound();

  const businesses = await prisma.business.findMany({
    include: { reviews: { where: { status: { not: "HIDDEN" } }, select: { createdAt: true } } },
    take: 300,
  });

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let picked = businesses;

  if (kind === "trending") {
    picked = businesses
      .map((b) => ({ b, recent: b.reviews.filter((r) => +r.createdAt >= monthAgo).length }))
      .filter((x) => x.recent > 0)
      .sort((a, b) => b.recent - a.recent || b.b.scoreAvg - a.b.scoreAvg)
      .map((x) => x.b);
  } else if (kind === "top") {
    picked = businesses
      .filter((b) => b.scoreCount >= 3)
      .sort((a, b) => b.scoreAvg - a.scoreAvg || b.scoreCount - a.scoreCount);
  } else {
    picked = businesses
      .filter((b) => b.scoreCount >= 1 && b.scoreCount <= 4 && b.scoreAvg >= 3.8)
      .sort((a, b) => b.scoreAvg - a.scoreAvg);
  }
  picked = picked.slice(0, 40);

  return (
    <div>
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← All businesses
      </Link>
      <h1 className="text-2xl font-bold mt-2">
        {meta.icon} {meta.title}
      </h1>
      <p className="text-sm text-stone-600 mt-1">{meta.blurb}</p>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {picked.map((b) => (
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
            cityRank={b.cityRank}
            cityRankSize={b.cityRankSize}
          />
        ))}
        {picked.length === 0 && (
          <p className="sm:col-span-2 text-center py-10 text-stone-500">
            Nothing here yet — this fills up as reviews come in.
          </p>
        )}
      </section>
    </div>
  );
}
