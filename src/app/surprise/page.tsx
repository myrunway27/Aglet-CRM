import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Decision paralysis is the state most people are actually in. One button,
// one well-reviewed place, and a reroll.
export default async function SurprisePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const candidates = await prisma.business.findMany({
    where: {
      ...(city ? { city } : {}),
      OR: [{ scoreCount: { gte: 1 }, scoreAvg: { gte: 3.5 } }, { scoreCount: 0 }],
    },
    select: { slug: true },
    take: 300,
  });

  if (candidates.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-10">
        <h1 className="text-2xl font-bold">🎲 Surprise me</h1>
        <p className="mt-2 text-sm text-stone-600">
          Not enough places listed yet to pick from.{" "}
          <Link href="/add-business" className="text-brand-700 hover:underline">
            Add one
          </Link>
          .
        </p>
      </div>
    );
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  redirect(`/business/${pick.slug}?surprise=1`);
}
