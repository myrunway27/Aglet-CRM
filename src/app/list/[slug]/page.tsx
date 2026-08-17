import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseTags } from "@/lib/tags";
import { BusinessCard } from "@/components/BusinessCard";
import { ListControls } from "@/components/ListControls";

export const dynamic = "force-dynamic";

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const list = await prisma.userList.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, pseudonym: true } },
      items: { include: { business: true }, orderBy: { position: "asc" } },
    },
  });
  if (!list) notFound();

  const isOwner = user?.id === list.userId;
  // The unguessable slug is the share credential — anyone with the link can
  // read it. Only the author sees it listed anywhere.
  if (!list.isPublic && !isOwner) notFound();

  return (
    <div>
      <Link href={isOwner ? "/lists" : "/"} className="text-sm text-brand-700 hover:underline">
        ← {isOwner ? "Your lists" : "Browse all"}
      </Link>
      <h1 className="text-2xl font-bold mt-2">{list.title}</h1>
      <p className="text-sm text-stone-500 mt-1">
        by 🕶️ {list.user.pseudonym ?? "someone"} · {list.items.length} place
        {list.items.length !== 1 ? "s" : ""}
        {!list.isPublic && " · private"}
      </p>
      {list.note && <p className="text-sm text-stone-700 mt-2">{list.note}</p>}

      {isOwner && <ListControls listId={list.id} slug={list.slug} isPublic={list.isPublic} />}

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.items.map((item) => (
          <BusinessCard
            key={item.id}
            slug={item.business.slug}
            name={item.business.name}
            category={item.business.category}
            city={item.business.city}
            avgRating={item.business.scoreCount > 0 ? item.business.scoreAvg : null}
            reviewCount={item.business.scoreCount}
            verifiedOwner={!!item.business.ownerId}
            tags={parseTags(item.business.tags)}
            priceLevel={item.business.priceLevel}
          />
        ))}
        {list.items.length === 0 && (
          <p className="sm:col-span-2 text-sm text-stone-500 py-6 text-center">
            Nothing on this list yet. Open a business and use &ldquo;Add to list&rdquo;.
          </p>
        )}
      </section>
    </div>
  );
}
