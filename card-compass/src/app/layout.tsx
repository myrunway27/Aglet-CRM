import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CountrySelect } from "@/components/CountrySelect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Compass: Pokémon card scanner & price references",
  description:
    "Scan a Pokémon TCG card, confirm the exact printing, and compare source-attributed US and EU reference prices.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2449b0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-slate-900">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 text-brand-700">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor" />
              </svg>
              <span>Card Compass</span>
            </Link>
            <CountrySelect />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl space-y-1 px-4 py-5 text-xs text-slate-600">
            <p>
              Reference prices are informational, shown in their original currency, and are not live offers. They may
              be stale and exclude shipping, taxes and duties.
            </p>
            <p>
              Card Compass is not affiliated with Nintendo, The Pokémon Company, TCGplayer or Cardmarket. Card data via
              the Pokémon TCG API.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
