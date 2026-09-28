"use client";

import { useSyncExternalStore } from "react";

export const REGIONS = {
  US: { label: "United States", currency: "USD" },
  GB: { label: "United Kingdom", currency: "GBP" },
  DE: { label: "Germany", currency: "EUR" },
  FR: { label: "France", currency: "EUR" },
  IT: { label: "Italy", currency: "EUR" },
  ES: { label: "Spain", currency: "EUR" },
  NL: { label: "Netherlands", currency: "EUR" },
  CA: { label: "Canada", currency: "CAD" },
  AU: { label: "Australia", currency: "AUD" },
  JP: { label: "Japan", currency: "JPY" },
} as const;
export type Region = keyof typeof REGIONS;

const KEY = "cardcompass.region";
const listeners = new Set<() => void>();

function read(): Region {
  try {
    const v = localStorage.getItem(KEY);
    if (v && v in REGIONS) return v as Region;
  } catch {
    /* storage unavailable */
  }
  return "US";
}

export function useRegion(): [Region, (r: Region) => void] {
  const region = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "US" as Region,
  );
  const set = (r: Region) => {
    try {
      localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };
  return [region, set];
}

/** Display preference only. No currency conversion happens anywhere. */
export function PreferenceSelector() {
  const [region, setRegion] = useRegion();
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <label className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Your country</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className="rounded border border-slate-300 bg-white px-2 py-1"
        >
          {Object.entries(REGIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label} ({v.currency})
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-600">
        Display preference only: prices stay in their original currency. We don&apos;t convert, because no dated
        exchange-rate feed is connected, and we don&apos;t estimate shipping or import duties to{" "}
        {REGIONS[region].label}.
      </p>
    </div>
  );
}
