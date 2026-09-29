"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

const TABS: Array<{ href: string; label: string; icon: string }> = [
  { href: "/", label: "Search", icon: "M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM16 16l4.5 4.5" },
  { href: "/collection", label: "Collection", icon: "M4 6h16v13H4zM8 6V4h8v2M4 11h16" },
  { href: "/market", label: "Market", icon: "M4 18l5-6 4 3 7-9M15 6h5v5" },
  { href: "/alerts", label: "Alerts", icon: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" },
  { href: "/more", label: "More", icon: "M5 12h.01M12 12h.01M19 12h.01" },
];

/** App-style tab bar on phones and tablets (the top links take over at laptop widths). */
export function BottomTabs({ unread }: { unread: number }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={isActive(t.href) ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-semibold ${isActive(t.href) ? "text-ink" : "text-muted"}`}
            >
              {isActive(t.href) && <span aria-hidden className="absolute top-0 h-1 w-10 rounded-b-full bg-primary" />}
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
              {t.href === "/alerts" && unread > 0 && (
                <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-bad-solid px-1.5 text-[10px] font-semibold text-white">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NavBar({ signedIn, unread }: { signedIn: boolean; unread: number }) {
  const path = usePathname();
  const router = useRouter();
  const link = (href: string, label: string, extra?: React.ReactNode) => (
    <Link
      href={href}
      aria-current={path === href ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 font-medium transition-colors ${path === href ? "bg-ink text-bg" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
    >
      {label}
      {extra}
    </Link>
  );
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 whitespace-nowrap text-sm lg:flex">
      {link("/", "Search")}
      {link("/collection", "Collection")}
      {link("/wishlist", "Wishlist")}
      {link("/sets", "Sets")}
      {link("/pokemon", "Pokémon")}
      {link("/market", "Market")}
      {link(
        "/alerts",
        "Alerts",
        unread > 0 ? (
          <span className="ml-1 rounded-full bg-bad-solid px-1.5 text-xs font-semibold text-white">
            {unread}
            <span className="sr-only"> unread</span>
          </span>
        ) : null,
      )}
      {signedIn ? (
        <>
          {link("/account", "Account")}
          <button
            className="rounded-full px-3 py-1.5 font-medium text-ink-2 hover:bg-sunken hover:text-ink"
            onClick={async () => {
              await api("/api/auth/logout", "POST", {}).catch(() => undefined);
              router.push("/");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        link("/login", "Sign in")
      )}
    </nav>
  );
}
