import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { NativeBridge } from "@/components/NativeBridge";
import { NavBar } from "@/components/NavBar";
import { PwaClient } from "@/components/PwaClient";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Compass — Pokémon card prices",
  description:
    "Scan a Pokémon TCG card, confirm the exact printing, compare source-attributed reference prices and verified listings with delivered cost, and track your collection.",
  appleWebApp: { capable: true, title: "Card Compass", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4338ca" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const unread = user
    ? await db()!
        .notification.count({ where: { userId: user.id, readAt: null } })
        .catch(() => 0)
    : 0;
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
            <Link href="/" className="flex items-center gap-2 whitespace-nowrap py-1 text-lg font-semibold text-slate-900">
              <span aria-hidden className="inline-block h-6 w-6 rounded-full border-4 border-brand-700 bg-white" />
              Card Compass
            </Link>
            <NavBar signedIn={Boolean(user)} unread={unread} />
          </div>
        </header>
        <PwaClient />
        <NativeBridge />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 text-xs leading-relaxed text-slate-600">
            Reference prices are attributed to their source, shown in the source&apos;s currency, and may be out of date.
            Listings are active asking prices, not completed sales. Delivered-cost figures are estimates. Not affiliated
            with The Pokémon Company, Nintendo, eBay, TCGplayer or Cardmarket.
          </div>
        </footer>
      </body>
    </html>
  );
}
