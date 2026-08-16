import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { OwnerReplyForm } from "@/components/OwnerReplyForm";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/owner");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id },
    include: {
      reviews: {
        where: { status: { not: "HIDDEN" } },
        include: { ownerReply: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mt-4">My businesses</h1>
      <p className="text-sm text-stone-600 mt-1">
        Reply publicly to reviews. Reviewers are anonymous — pen names are all anyone sees. If a
        review looks fake, report it from the business page and moderators will investigate.
      </p>

      {businesses.length === 0 && (
        <p className="mt-6 text-sm text-stone-500">
          You don&apos;t own any verified businesses yet. Find your business and click
          &ldquo;Claim it&rdquo; on its page.
        </p>
      )}

      <div className="mt-4 space-y-6">
        {businesses.map((b) => (
          <section key={b.id} className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/business/${b.slug}`}
                className="text-lg font-semibold text-brand-700 hover:underline"
              >
                {b.name}
              </Link>
              <span className="text-xs bg-brand-100 text-brand-800 px-2.5 py-1 rounded-full">
                ✓ Verified owner
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {b.reviews.map((r) => (
                <div key={r.id} className="border-t border-stone-100 pt-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-700">🕶️ {r.pseudonym}</span>
                    <Stars rating={r.rating} size="text-sm" />
                    <span>{r.createdAt.toLocaleDateString()}</span>
                    {!r.ownerReply && (
                      <span className="ml-auto text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Needs reply
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{r.text}</p>
                  {r.ownerReply && (
                    <p className="mt-1 text-xs text-stone-500">
                      Your reply: <span className="text-stone-700">{r.ownerReply.text}</span>
                    </p>
                  )}
                  <OwnerReplyForm reviewId={r.id} existingText={r.ownerReply?.text} />
                </div>
              ))}
              {b.reviews.length === 0 && (
                <p className="text-sm text-stone-500">No reviews yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
