"use client";
import { useSyncExternalStore } from "react";

export const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "IL", name: "Israel", currency: "ILS" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "JP", name: "Japan", currency: "JPY" },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]["code"];

const KEY = "cardcompass.country";
const EVENT = "cardcompass:country";

function read(): CountryCode {
  try {
    const v = localStorage.getItem(KEY);
    if (v && COUNTRIES.some((c) => c.code === v)) return v as CountryCode;
  } catch {
    /* storage unavailable */
  }
  return "US";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Display-only preference. The app never converts currencies. */
export function useCountry(): [CountryCode, (c: CountryCode) => void] {
  const value = useSyncExternalStore(subscribe, read, () => "US" as CountryCode);
  const set = (c: CountryCode) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [value, set];
}
