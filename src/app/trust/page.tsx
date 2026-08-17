import Link from "next/link";
import { prisma } from "@/lib/db";
import { PRIOR_MEAN, PRIOR_WEIGHT, HALF_LIFE_MONTHS } from "@/lib/rating";

export const dynamic = "force-dynamic";

// Publishing the numbers is the only way to claim reviews are hard to fake
// without asking to be taken on faith — and from a small site they're
// checkable, which makes them more persuasive, not less.
export default async function TrustPage() {
  const [total, flagged, excluded, hidden, disputes, disputesUpheld, frozen] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: "FLAGGED" } }),
    prisma.review.count({ where: { includedInScore: false } }),
    prisma.review.count({ where: { status: "HIDDEN" } }),
    prisma.reviewFlag.count(),
    prisma.reviewFlag.count({ where: { status: "UPHELD" } }),
    prisma.business.count({ where: { scoreFrozen: true } }),
  ]);

  const pct = (n: number) => (total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`);

  const stats = [
    { label: "Reviews submitted", value: total },
    { label: "Flagged for a human check", value: flagged, sub: pct(flagged) },
    { label: "Not counted in a rating", value: excluded, sub: pct(excluded) },
    { label: "Removed for breaking the rules", value: hidden, sub: pct(hidden) },
    { label: "Owner disputes received", value: disputes },
    { label: "Owner disputes upheld", value: disputesUpheld },
    { label: "Scores currently frozen", value: frozen },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mt-4">How we keep reviews honest</h1>
      <p className="text-sm text-stone-600 mt-1">
        Everything on this page updates automatically. We&apos;d rather show you the numbers than
        ask you to trust us.
      </p>

      <section className="mt-6">
        <h2 className="font-semibold text-lg">The numbers, right now</h2>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-3">
              <p className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
              <p className="text-xs text-stone-600 mt-0.5">{s.label}</p>
              {s.sub && <p className="text-xs text-stone-400">{s.sub} of all reviews</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-4 text-sm text-stone-700">
        <div>
          <h2 className="font-semibold text-lg text-stone-900">We hide reviews from the score, we don&apos;t delete them</h2>
          <p className="mt-1">
            When a review looks doubtful — or an owner disputes it and a moderator agrees — it stops
            counting toward the star rating but stays on the page for you to read and judge
            yourself. Deleting reviews is how a review site quietly becomes useless.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">New places don&apos;t start at five stars</h2>
          <p className="mt-1">
            A rating is pulled toward the site-wide average of {PRIOR_MEAN.toFixed(1)} in proportion
            to how little evidence backs it — roughly {PRIOR_WEIGHT} reviews&rsquo; worth. One
            glowing review can&apos;t mint a perfect score, which removes the cheapest way to game a
            small site. Where the evidence is thin we say so in plain words on the page.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">Recent reviews count for more</h2>
          <p className="mt-1">
            A review&apos;s weight halves roughly every {HALF_LIFE_MONTHS} months, so a score
            describes the business as it is now — and a burst of bought praise is a depreciating
            asset rather than a permanent win.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">Sudden bursts freeze the score</h2>
          <p className="mt-1">
            If a quiet business suddenly collects a pile of reviews, its score is held at the
            previous value until a person looks. The reviews stay visible throughout, and the
            business page says plainly that this has happened.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">Owners can reply and dispute, never delete</h2>
          <p className="mt-1">
            A verified owner can respond publicly to anything, and can dispute a review by
            submitting evidence. An unanswered dispute never removes a review — some platforms
            delete reviews when the reviewer doesn&apos;t produce paperwork in time, which turns
            disputing into a censorship button. Ours doesn&apos;t.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">Nobody can pay for a better rating</h2>
          <p className="mt-1">
            There is no paid tier, no advertising, and no way for a business to influence its score
            or have criticism taken down. We also don&apos;t let businesses invite only their happy
            customers.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg text-stone-900">You are anonymous to everyone</h2>
          <p className="mt-1">
            Reviews are published under a pen name that belongs to your account. Businesses never
            see who you are, and neither do other readers. Your email exists only to sign in and to
            stop one person flooding the site.
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-brand-700 hover:underline">
          ← Back to browsing
        </Link>
      </p>
    </div>
  );
}
