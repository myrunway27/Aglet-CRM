import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Viewing the page marks everything as read.
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mt-4">Notifications</h1>
      <div className="mt-4 space-y-2">
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.link}
            className={`block bg-white rounded-xl border p-4 hover:border-brand-600 transition ${
              n.readAt ? "border-stone-200" : "border-brand-600"
            }`}
          >
            <p className="text-sm">{n.message}</p>
            <p className="mt-1 text-xs text-stone-500">
              {n.createdAt.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {!n.readAt && <span className="ml-2 text-brand-700 font-medium">new</span>}
            </p>
          </Link>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-stone-500">Nothing yet. You&apos;ll hear from us here when something happens on your reviews or businesses.</p>
        )}
      </div>
    </div>
  );
}
