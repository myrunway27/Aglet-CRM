import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { NativeBridge } from "@/components/NativeBridge";
import { LogoMark } from "@/components/Logo";
import { BottomTabs, NavBar } from "@/components/NavBar";
import { PwaClient } from "@/components/PwaClient";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const body = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});
const heading = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Card Compass — Pokémon card prices",
  description:
    "Scan a Pokémon TCG card, confirm the exact printing, compare source-attributed reference prices and verified listings with delivered cost, and track your collection.",
  appleWebApp: {
    capable: true,
    title: "Card Compass",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c1b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const unread = user
    ? await db()!
        .notification.count({ where: { userId: user.id, readAt: null } })
        .catch(() => 0)
    : 0;
  return (
    <html
      lang="en"
      className={`h-full antialiased ${body.variable} ${heading.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved accent colour before first paint (no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=localStorage.getItem("cc.accent");if(a&&/^[a-z]{3,8}$/.test(a))document.documentElement.dataset.accent=a}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col pb-16 font-sans lg:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-ink"
            >
              <LogoMark className="h-8 w-8" />
              Card Compass
            </Link>
            <NavBar signedIn={Boolean(user)} unread={unread} />
          </div>
        </header>
        <PwaClient />
        <NativeBridge />
        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-6 sm:pt-6"
        >
          {children}
        </main>
        <footer className="mt-8 border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-2 px-4 py-6 text-xs leading-relaxed text-muted">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-ink-2">
              <LogoMark className="h-5 w-5" /> Card Compass
            </p>
            <p>
              Reference prices are shown in each source&apos;s own currency and
              may be out of date. Listings are asking prices, not completed
              sales, and delivered costs are estimates. Not affiliated with The
              Pokémon Company, Nintendo, eBay, TCGplayer, Cardmarket,
              PriceCharting or PSA.
            </p>
            <p className="flex gap-4">
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
              <Link href="/terms" className="underline">
                Terms
              </Link>
            </p>
          </div>
        </footer>
        <BottomTabs unread={unread} />
      </body>
    </html>
  );
}
