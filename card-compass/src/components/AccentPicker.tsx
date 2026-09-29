"use client";

import { useEffect, useState } from "react";

const ACCENTS = [
  { id: "yellow", label: "Yellow", color: "#ffcb2e" },
  { id: "blue", label: "Blue", color: "#6cb8ff" },
  { id: "pink", label: "Pink", color: "#ff8fc7" },
  { id: "green", label: "Green", color: "#5ee39a" },
  { id: "purple", label: "Purple", color: "#b69cff" },
] as const;

/** Accent colour for buttons and highlights, saved on this device. */
export function AccentPicker() {
  // null until we've read what the head script applied, so we never overwrite it on mount.
  const [accent, setAccent] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the value the head script applied
    setAccent(document.documentElement.getAttribute("data-accent") ?? "yellow");
  }, []);
  useEffect(() => {
    if (accent === null) return;
    const root = document.documentElement;
    if (accent === "yellow") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
    try {
      if (accent === "yellow") localStorage.removeItem("cc.accent");
      else localStorage.setItem("cc.accent", accent);
    } catch {
      /* storage unavailable: applies for this visit only */
    }
  }, [accent]);
  const choose = (id: string) => setAccent(id);
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">Accent colour</legend>
      <div className="flex flex-wrap gap-2">
        {ACCENTS.map((a) => (
          <label
            key={a.id}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${accent === a.id ? "border-ink ring-2 ring-ink" : "border-line-strong"}`}
          >
            <input type="radio" name="accent" value={a.id} checked={accent === a.id} onChange={() => choose(a.id)} className="sr-only" />
            <span aria-hidden className="h-4 w-4 rounded-full border border-black/10" style={{ background: a.color }} />
            {a.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Saved on this device. Light or dark follows your phone&apos;s setting.</p>
    </fieldset>
  );
}
