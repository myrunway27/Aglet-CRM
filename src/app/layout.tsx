import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "True Review — reviewed by the people, for the people",
  description:
    "Reviewed by the people, for the people. 100% anonymous reviews for every kind of business.",
  applicationName: "True Review",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "True Review", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f1f3d",
  width: "device-width",
  initialScale: 1,
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,500&family=Hanken+Grotesk:wght@400;500;600;700&family=Nunito:wght@900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="bg-navy text-white sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link href="/" className="shrink-0">
              <Logo />
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm whitespace-nowrap">
              <Link href="/map" className="hidden sm:inline px-2.5 py-1.5 rounded hover:bg-white/10">
                Map
              </Link>
              <Link href="/add-business" className="hidden sm:inline px-2.5 py-1.5 rounded hover:bg-white/10">
                Add business
              </Link>
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="relative px-2.5 py-1.5 rounded hover:bg-white/10"
                    aria-label="Notifications"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  {ownsBusinesses && (
                    <Link href="/owner" className="hidden sm:inline px-2.5 py-1.5 rounded hover:bg-white/10">
                      My businesses
                    </Link>
                  )}
                  {user.isAdmin && (
                    <Link href="/admin" className="hidden sm:inline px-2.5 py-1.5 rounded hover:bg-white/10">
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="px-2.5 py-1.5 rounded hover:bg-white/10">
                    Account
                  </Link>
                  <form action={logout} className="hidden sm:block">
                    <button className="px-2.5 py-1.5 rounded hover:bg-white/10 cursor-pointer">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-2 sm:px-2.5 py-1.5 rounded hover:bg-white/10">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700"
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
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">{children}</main>
        <footer className="border-t border-line mt-10 text-center text-xs text-stone-500 py-8 px-4">
          <p>
            True Review — reviewed by the people, for the people. Reviews are anonymous; your
            identity is never shown to businesses or other users.
          </p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/trust" className="text-brand-700 hover:underline">How we keep reviews honest</Link>
            <Link href="/guidelines" className="text-brand-700 hover:underline">Review guidelines</Link>
            <Link href="/terms" className="text-brand-700 hover:underline">Terms of service</Link>
            <Link href="/privacy" className="text-brand-700 hover:underline">Privacy</Link>
          </p>
          <p className="mt-2 text-stone-400">
            Some listings sourced from{" "}
            <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-brand-700">
              OpenStreetMap
            </a>{" "}
            contributors (ODbL).
          </p>
        </footer>
      </body>
    </html>
  );
}
