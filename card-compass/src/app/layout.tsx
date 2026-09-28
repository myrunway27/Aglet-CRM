import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Compass — Pokémon card price references",
  description:
    "Scan a Pokémon TCG card, confirm the exact printing, and compare source-attributed US and EU reference prices.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 whitespace-nowrap text-lg font-semibold text-slate-900">
              <span aria-hidden className="inline-block h-6 w-6 rounded-full border-4 border-brand-700 bg-white" />
              Card Compass
            </Link>
            <span className="hidden text-xs text-slate-600 sm:inline">Reference prices, not listings</span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 text-xs leading-relaxed text-slate-600">
            Card Compass shows informational reference prices attributed to their source, in the
            source&apos;s original currency. They are not live offers, may be out of date, and are
            not a guarantee of what any seller will charge. Not affiliated with The Pokémon Company,
            Nintendo, TCGplayer or Cardmarket.
          </div>
        </footer>
      </body>
    </html>
  );
}
