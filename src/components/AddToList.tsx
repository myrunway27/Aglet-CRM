"use client";

import { useState, useTransition } from "react";
import { addToList } from "@/actions/saves";

export function AddToList({
  businessId,
  lists,
}: {
  businessId: string;
  lists: { id: string; title: string; has: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [added, setAdded] = useState<string[]>([]);

  if (lists.length === 0) return null;

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs rounded-full border border-stone-300 bg-white px-3 py-1.5 text-stone-600 hover:border-brand-600 cursor-pointer"
      >
        ＋ Add to list
      </button>
      {open && (
        <span className="absolute z-10 mt-1 left-0 w-56 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5 block">
          {lists.map((l) => {
            const on = l.has || added.includes(l.id);
            return (
              <button
                key={l.id}
                disabled={pending || on}
                onClick={() =>
                  start(() =>
                    addToList(l.id, businessId).then(() => setAdded((a) => [...a, l.id]))
                  )
                }
                className="block w-full text-left text-sm px-2.5 py-1.5 rounded-lg hover:bg-stone-100 disabled:text-stone-400 cursor-pointer disabled:cursor-default"
              >
                {on ? "✓ " : ""}
                {l.title}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
