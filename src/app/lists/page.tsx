import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NewListForm } from "@/components/NewListForm";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lists");

  const lists = await prisma.userList.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mt-4">Your lists</h1>
      <p className="text-sm text-stone-600 mt-1">
        Group places however you like — &ldquo;kosher dairy in Queens, ranked&rdquo; — and share a
        link. Lists are private until you publish them, and always under your pen name.
      </p>

      <div className="mt-4">
        <NewListForm />
      </div>

      <div className="mt-4 space-y-2">
        {lists.map((l) => (
          <Link
            key={l.id}
            href={`/list/${l.slug}`}
            className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-brand-600"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{l.title}</span>
              <span className="text-xs text-stone-500">
                {l._count.items} place{l._count.items !== 1 ? "s" : ""}
                {l.isPublic ? " · public" : " · private"}
              </span>
            </div>
            {l.note && <p className="text-sm text-stone-600 mt-1">{l.note}</p>}
          </Link>
        ))}
        {lists.length === 0 && (
          <p className="text-sm text-stone-500">No lists yet — make your first one above.</p>
        )}
      </div>
    </div>
  );
}
