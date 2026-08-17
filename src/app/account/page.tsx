import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { PenNameCard } from "@/components/PenNameCard";
import { DietStandardCard } from "@/components/DietStandardCard";
import { parseStandards } from "@/lib/diet";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Live",
  FLAGGED: "Live — under moderator check",
  HIDDEN: "Removed by moderators",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [reviews, claims, saves] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ownerClaim.findMany({
      where: { userId: user.id },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.save.findMany({
      where: { userId: user.id },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const want = saves.filter((s) => s.kind === "WANT");
  const been = saves.filter((s) => s.kind === "BEEN");

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mt-4">Your account</h1>
      <p className="text-sm text-stone-600 mt-1">
        Signed in as <strong>{user.email}</strong>. Only you (and no one else) can see which
        reviews are yours.
      </p>

      <PenNameCard penName={user.pseudonym} />
      <DietStandardCard current={parseStandards(user.dietStandard)} />

      <div className="mt-4 flex gap-2 flex-wrap text-sm">
        <Link href="/lists" className="text-brand-700 hover:underline">
          Your lists →
        </Link>
        <span className="text-stone-300">·</span>
        <Link href="/year" className="text-brand-700 hover:underline">
          Your year in review →
        </Link>
      </div>

      {(want.length > 0 || been.length > 0) && (
        <section className="mt-6">
          <h2 className="font-semibold">Saved places</h2>
          {want.length > 0 && (
            <>
              <p className="text-sm text-stone-500 mt-2">Want to go ({want.length})</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {want.map((s) => (
                  <Link
                    key={s.id}
                    href={`/business/${s.business.slug}`}
                    className="text-xs bg-white border border-stone-200 rounded-full px-3 py-1.5 hover:border-brand-600"
                  >
                    {s.business.name}
                  </Link>
                ))}
              </div>
            </>
          )}
          {been.length > 0 && (
            <>
              <p className="text-sm text-stone-500 mt-3">Been there ({been.length})</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {been.map((s) => (
                  <Link
                    key={s.id}
                    href={`/business/${s.business.slug}`}
                    className="text-xs bg-white border border-stone-200 rounded-full px-3 py-1.5 hover:border-brand-600"
                  >
                    {s.business.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <h2 className="font-semibold mt-6">Your reviews ({reviews.length})</h2>
      <div className="mt-2 space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/business/${r.business.slug}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {r.business.name}
              </Link>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === "HIDDEN"
                    ? "bg-red-100 text-red-800"
                    : r.status === "FLAGGED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-brand-100 text-brand-800"
                }`}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
              <Stars rating={r.rating} size="text-sm" />
              <span>as 🕶️ {r.pseudonym}</span>
              <span>· {r.createdAt.toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm text-stone-700 line-clamp-2">{r.text}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-stone-500">You haven&apos;t written any reviews yet.</p>
        )}
      </div>

      {claims.length > 0 && (
        <>
          <h2 className="font-semibold mt-6">Your business claims</h2>
          <div className="mt-2 space-y-2">
            {claims.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between gap-2"
              >
                <Link
                  href={`/business/${c.business.slug}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {c.business.name}
                </Link>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "APPROVED"
                      ? "bg-brand-100 text-brand-800"
                      : c.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {c.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
