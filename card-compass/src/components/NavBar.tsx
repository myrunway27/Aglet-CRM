"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

export function NavBar({ signedIn, unread }: { signedIn: boolean; unread: number }) {
  const path = usePathname();
  const router = useRouter();
  const link = (href: string, label: string, extra?: React.ReactNode) => (
    <Link
      href={href}
      aria-current={path === href ? "page" : undefined}
      className={`rounded px-2 py-1 ${path === href ? "bg-brand-50 font-semibold text-brand-800" : "text-slate-700 hover:text-slate-900"}`}
    >
      {label}
      {extra}
    </Link>
  );
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm">
      {link("/", "Scan")}
      {link("/collection", "Collection")}
      {link(
        "/alerts",
        "Alerts",
        unread > 0 ? (
          <span className="ml-1 rounded-full bg-red-700 px-1.5 text-xs font-semibold text-white">
            {unread}
            <span className="sr-only"> unread</span>
          </span>
        ) : null,
      )}
      {signedIn ? (
        <>
          {link("/account", "Account")}
          <button
            className="rounded px-2 py-1 text-slate-700 hover:text-slate-900"
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
