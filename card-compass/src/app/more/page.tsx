import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "More — Card Compass" };

const ITEMS = [
  { href: "/wishlist", label: "Wishlist", hint: "Cards you want, with target prices" },
  { href: "/sets", label: "Set completion", hint: "What you own and what's missing" },
  { href: "/scan/bulk", label: "Scan a stack", hint: "Add many cards at once" },
  { href: "/graded", label: "Add a PSA slab", hint: "Look up a cert number" },
];

export default async function MorePage() {
  const user = await currentUser();
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">More</h1>
      <ul className="grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">{i.label}</span>
                <span className="block text-sm text-slate-600">{i.hint}</span>
              </span>
              <span aria-hidden className="text-slate-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {user ? (
          <>
            <li>
              <Link href="/account" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <span>
                  <span className="block font-semibold">Account</span>
                  <span className="block text-sm text-slate-600">{user.email}</span>
                </span>
                <span aria-hidden className="text-slate-400">›</span>
              </Link>
            </li>
            <li className="px-4 py-3">
              <SignOutButton />
            </li>
          </>
        ) : (
          <li>
            <Link href="/login" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">Sign in or create an account</span>
                <span className="block text-sm text-slate-600">Save your collection, wishlist and alerts</span>
              </span>
              <span aria-hidden className="text-slate-400">›</span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
