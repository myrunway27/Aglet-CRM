import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ClaimForm } from "@/components/ClaimForm";
import { expectedDomainHint } from "@/lib/claims";

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/business/${slug}/claim`);

  return (
    <div className="max-w-lg mx-auto mt-4">
      <Link href={`/business/${slug}`} className="text-sm text-brand-700 hover:underline">
        ← Back to {business.name}
      </Link>
      <h1 className="text-2xl font-bold mt-2">Claim {business.name}</h1>
      <p className="text-sm text-stone-600 mt-1">
        Verified owners get a badge and can publicly reply to reviews. Replies are visible to
        everyone; reviewer identities stay hidden from you and everyone else.
      </p>
      <div className="mt-4 bg-white rounded-xl border border-stone-200 p-5">
        {business.ownerId ? (
          <p className="text-sm text-stone-600">This business already has a verified owner.</p>
        ) : (
          <ClaimForm
            businessId={business.id}
            businessName={business.name}
            domainHint={expectedDomainHint(business.name)}
          />
        )}
      </div>
    </div>
  );
}
