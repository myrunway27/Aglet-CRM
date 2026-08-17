import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logout } from "@/actions/auth";

export const metadata: Metadata = {
  title: "The True Review",
  description: "100% anonymous reviews for every kind of business.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [ownsBusinesses, unreadCount] = user
    ? await Promise.all([
        prisma.business.count({ where: { ownerId: user.id } }).then((n) => n > 0),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      ])
    : [false, 0];

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-gradient-to-r from-brand-800 to-brand-700 text-white sticky top-0 z-20 shadow">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="bg-white rounded-lg p-1 flex items-center justify-center shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" className="h-6 w-6" />
              </span>
              <span className="font-bold text-lg tracking-tight leading-none">
                The True<span className="text-star"> Review</span>
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              <Link href="/add-business" className="px-2.5 py-1.5 rounded hover:bg-brand-800">
                Add business
              </Link>
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="relative px-2.5 py-1.5 rounded hover:bg-brand-800"
                    aria-label="Notifications"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-star text-brand-900 text-[10px] font-bold rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  {ownsBusinesses && (
                    <Link href="/owner" className="px-2.5 py-1.5 rounded hover:bg-brand-800">
                      My businesses
                    </Link>
                  )}
                  {user.isAdmin && (
                    <Link href="/admin" className="px-2.5 py-1.5 rounded hover:bg-brand-800">
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="px-2.5 py-1.5 rounded hover:bg-brand-800">
                    Account
                  </Link>
                  <form action={logout}>
                    <button className="px-2.5 py-1.5 rounded hover:bg-brand-800 cursor-pointer">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-2.5 py-1.5 rounded hover:bg-brand-800">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-2.5 py-1.5 rounded bg-star text-brand-900 font-semibold hover:brightness-110"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {user && !user.emailVerifiedAt && (
          <div className="bg-amber-100 text-amber-900 text-sm text-center px-4 py-2">
            Your email isn&apos;t verified yet — you can browse, but not post.{" "}
            <Link href="/verify" className="font-semibold underline">
              Verify now
            </Link>
          </div>
        )}
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-stone-500 py-6 px-4">
          The True Review — reviews are anonymous. Your identity is never shown to businesses or
          other users.
        </footer>
      </body>
    </html>
  );
}
