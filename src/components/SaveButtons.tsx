"use client";

import { useTransition } from "react";
import { toggleSave } from "@/actions/saves";

export function SaveButtons({
  businessId,
  want,
  been,
  loggedIn,
}: {
  businessId: string;
  want: boolean;
  been: boolean;
  loggedIn: boolean;
}) {
  const [pending, start] = useTransition();
  if (!loggedIn) return null;

  const base =
    "text-xs rounded-full border px-3 py-1.5 cursor-pointer disabled:opacity-50 transition-colors";

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => toggleSave(businessId, "WANT").then(() => {}))}
        className={`${base} ${
          want
            ? "bg-brand-600 text-white border-brand-600"
            : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
        }`}
      >
        {want ? "✓ Want to go" : "＋ Want to go"}
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => toggleSave(businessId, "BEEN").then(() => {}))}
        className={`${base} ${
          been
            ? "bg-brand-800 text-white border-brand-800"
            : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
        }`}
      >
        {been ? "✓ Been there" : "＋ Been there"}
      </button>
    </div>
  );
}
