"use client";
import { COUNTRIES, useCountry, type CountryCode } from "@/lib/prefs";

export function CountrySelect() {
  const [country, setCountry] = useCountry();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="hidden sm:inline">Ship to</span>
      <span className="sr-only sm:hidden">Ship-to country (display preference)</span>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value as CountryCode)}
        className="max-w-[11rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 sm:max-w-none"
        aria-describedby="country-hint"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <span id="country-hint" className="sr-only">
        Display preference only. Prices are never converted.
      </span>
    </label>
  );
}
