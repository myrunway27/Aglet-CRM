import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { parseQuickTags, quickTagLabel } from "@/lib/quicktags";

export const dynamic = "force-dynamic";

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const { y } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/year");

  const year = Number(y) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [reviews, beenCount, wantCount] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      include: { business: true },
      orderBy: { rating: "desc" },
    }),
    prisma.save.count({ where: { userId: user.id, kind: "BEEN", createdAt: { gte: start, lt: end } } }),
    prisma.save.count({ where: { userId: user.id, kind: "WANT", createdAt: { gte: start, lt: end } } }),
  ]);

  const cities = new Set(reviews.map((r) => r.business.city));
  const categories = new Set(reviews.map((r) => r.business.category));
  const loved = reviews.filter((r) => r.loved);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const tagCounts = new Map<string, number>();
  for (const r of reviews) {
    for (const t of parseQuickTags(r.quickTags)) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stat = (label: string, value: string | number) => (
    <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-stone-600 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-baseline justify-between gap-2 mt-4">
        <h1 className="text-2xl font-bold">Your {year}</h1>
        <span className="text-sm text-stone-500">🕶️ {user.pseudonym}</span>
      </div>
      <p className="text-sm text-stone-600 mt-1">
        Just for you — nothing here is public unless you share it.
      </p>

      {reviews.length === 0 && beenCount === 0 ? (
        <p className="mt-6 text-sm text-stone-500">
          Nothing logged in {year} yet.{" "}
          <Link href="/" className="text-brand-700 hover:underline">
            Go find somewhere
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stat("reviews written", reviews.length)}
            {stat("places visited", beenCount)}
            {stat("still to try", wantCount)}
            {stat("cities", cities.size)}
            {stat("kinds of place", categories.size)}
            {stat("loved ♥", loved.length)}
          </div>

          {reviews.length > 0 && (
            <p className="mt-3 text-sm text-stone-600 text-center">
              You gave an average of <strong>{avg.toFixed(1)}</strong> stars.
            </p>
          )}

          {reviews.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">Your top places of {year}</h2>
              <div className="mt-2 space-y-2">
                {reviews.slice(0, 10).map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/business/${r.business.slug}`}
                    className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-3 hover:border-brand-600"
                  >
                    <span className="text-lg font-bold text-stone-300 tabular-nums w-6">{i + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{r.business.name}</span>
                      <span className="text-xs text-stone-500">
                        {r.business.city} · {r.business.category}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Stars rating={r.rating} size="text-xs" />
                      <span className="text-xs text-stone-600">{r.rating.toFixed(1)}</span>
                      {r.loved && <span className="text-rose-600 text-xs">♥</span>}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {topTags.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">What you kept saying</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topTags.map(([tag, n]) => (
                  <span
                    key={tag}
                    className="text-sm bg-brand-50 border border-brand-100 text-brand-800 px-3 py-1.5 rounded-full"
                  >
                    {quickTagLabel(tag)} <span className="text-brand-600">×{n}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="mt-8 text-sm">
        <Link href={`/year?y=${year - 1}`} className="text-brand-700 hover:underline">
          ← {year - 1}
        </Link>
      </p>
    </div>
  );
}
