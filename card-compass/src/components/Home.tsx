"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ClientApiError, readJson, type ScanResponse, type SearchResponse } from "@/lib/api-types";
import type { CatalogCard } from "@/lib/catalog/types";
import { CameraScanner } from "./CameraScanner";
import { CardArt } from "./CardArt";
import { DemoBanner } from "./DemoBanner";

type Recent = Pick<CatalogCard, "catalogId" | "name" | "setName" | "number">;
type ScanState =
  | { kind: "idle" }
  | { kind: "reading"; preview: string }
  | { kind: "done"; preview: string; scan: ScanResponse; showAll: boolean }
  | { kind: "error"; preview: string | null; message: string };

const RECENT_KEY = "cc.recent";
function loadRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 8);
  } catch {
    return [];
  }
}
function saveRecent(c: Recent) {
  try {
    const next = [c, ...loadRecent().filter((r) => r.catalogId !== c.catalogId)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

const CameraIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const SearchIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export function Home({ initialMode }: { initialMode: "mock" | "live" }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogCard[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CatalogCard[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });
  const [recent, setRecent] = useState<Recent[]>([]);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read per-device history after mount
    setRecent(loadRecent());
  }, []);

  // Type-ahead suggestions (debounced)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // cleared in the input's change handler
    const t = setTimeout(async () => {
      try {
        const r = await readJson<SearchResponse>(await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`));
        setSuggestions(r.results.slice(0, 6));
        setActive(-1);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const openCard = useCallback(
    (card: CatalogCard, scanId?: string | null) => {
      saveRecent({ catalogId: card.catalogId, name: card.name, setName: card.setName, number: card.number });
      if (scanId) {
        void fetch(`/api/scans/${encodeURIComponent(scanId)}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogId: card.catalogId }),
        }).catch(() => undefined);
      }
      router.push(`/cards/${encodeURIComponent(card.catalogId)}`);
    },
    [router],
  );

  async function runSearch(q: string) {
    setOpen(false);
    if (q.trim().length < 2) return setSearchError("Type at least 2 characters.");
    setSearching(true);
    setSearchError(null);
    try {
      const r = await readJson<SearchResponse>(await fetch(`/api/cards/search?q=${encodeURIComponent(q.trim())}`));
      setResults(r.results);
    } catch (err) {
      setSearchError(err instanceof ClientApiError ? err.message : "Network error. Check your connection.");
    }
    setSearching(false);
  }

  const onImage = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setResults(null);
    setScan({ kind: "reading", preview });
    setTimeout(() => scanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    const form = new FormData();
    form.set("image", file);
    try {
      const s = await readJson<ScanResponse>(await fetch("/api/scan", { method: "POST", body: form }));
      setScan({ kind: "done", preview, scan: s, showAll: false });
    } catch (err) {
      setScan({ kind: "error", preview, message: err instanceof ClientApiError ? err.message : "Network error. Check your connection." });
    }
  }, []);
  const closeCamera = useCallback(() => setCamera(false), []);

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && suggestions[active]) openCard(suggestions[active]);
      else void runSearch(query);
    } else if (e.key === "Escape") setOpen(false);
  }

  const top = scan.kind === "done" ? scan.scan.match.candidates[0] : undefined;
  const confident = scan.kind === "done" && top?.confidence === "high" && !scan.scan.match.ambiguous;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section aria-labelledby="find-h" className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-2 sm:pt-6">
        <div className="grid gap-1">
          <h1 id="find-h" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find any Pokémon card
          </h1>
          <p className="text-slate-700">Type a name or number, or scan the card with your camera.</p>
        </div>

        {/* Search bar with a scan button inside */}
        <div className="relative">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white py-1.5 pr-1.5 pl-3 shadow-sm focus-within:border-brand-700"
          >
            <span className="text-slate-500">
              <SearchIcon />
            </span>
            <label htmlFor="q" className="sr-only">
              Card name or number
            </label>
            <input
              id="q"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length < 2) setSuggestions([]);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKey}
              maxLength={80}
              placeholder="Pikachu, Charizard ex, 025/198…"
              className="w-0 min-w-0 flex-1 bg-transparent py-2 text-lg outline-none focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={() => setCamera(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800"
            >
              <CameraIcon />
              Scan
            </button>
          </form>

          {open && suggestions.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-20 mt-1 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {suggestions.map((c, idx) => (
                <li
                  key={c.catalogId}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={idx === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openCard(c)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 ${idx === active ? "bg-brand-50" : "hover:bg-slate-50"}`}
                >
                  <CardArt card={c} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-slate-700">
                      {c.setName} · #{c.number}
                      {c.setPrintedTotal ? `/${c.setPrintedTotal}` : ""}
                    </span>
                    {c.rarity && <span className="block text-xs text-slate-600">{c.rarity}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/scan/bulk" className="font-medium text-brand-700 underline">Scan a stack of cards</Link>
          <Link href="/graded" className="font-medium text-brand-700 underline">Add a PSA slab</Link>
          <Link href="/market" className="font-medium text-brand-700 underline">See what&apos;s moving</Link>
        </div>

        {recent.length > 0 && scan.kind === "idle" && !results && (
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Recently viewed</h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <Link
                  key={r.catalogId}
                  href={`/cards/${encodeURIComponent(r.catalogId)}`}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-slate-500"
                >
                  {r.name} <span className="text-slate-600">· {r.setName} #{r.number}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {initialMode === "mock" && <DemoBanner />}

      <div ref={scanRef} aria-live="polite" className="scroll-mt-4">
        {scan.kind === "reading" && (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- local photo preview */}
            <img src={scan.preview} alt="Your photo" className="h-24 w-16 rounded object-cover" />
            <p className="flex items-center gap-2 text-lg font-medium">
              <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
              Reading your card…
            </p>
          </div>
        )}

        {scan.kind === "error" && (
          <div role="alert" className="grid gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <p className="font-semibold">{scan.message}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCamera(true)} className="rounded-lg bg-red-800 px-3 py-2 font-medium text-white">Try again</button>
              <button onClick={() => setScan({ kind: "idle" })} className="rounded-lg border border-red-800 px-3 py-2 font-medium">Cancel</button>
            </div>
          </div>
        )}

        {scan.kind === "done" && scan.scan.match.candidates.length === 0 && (
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-semibold">We couldn&apos;t read that card</h2>
            <ul className="list-disc pl-5 text-slate-700">
              <li>Fill the frame with the whole card and hold still</li>
              <li>Tilt it slightly to get rid of glare</li>
              <li>Or type the name or the number at the bottom (like 025/198) in the search bar</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCamera(true)} className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white">Scan again</button>
              <button
                onClick={() => {
                  setScan({ kind: "idle" });
                  document.getElementById("q")?.focus();
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium"
              >
                Type instead
              </button>
            </div>
          </div>
        )}

        {scan.kind === "done" && top && confident && !scan.showAll && (
          <section aria-labelledby="match-h" className="flex gap-4 rounded-2xl border-2 border-brand-700 bg-white p-4">
            <CardArt card={top.card} size="md" />
            <div className="grid min-w-0 content-start gap-3">
              <h2 id="match-h" className="text-sm font-semibold uppercase tracking-wide text-brand-700">Is this your card?</h2>
              <div>
                <p className="text-2xl font-bold">{top.card.name}</p>
                <p className="text-slate-700">
                  {top.card.setName} · #{top.card.number}
                  {top.card.setPrintedTotal ? `/${top.card.setPrintedTotal}` : ""}
                  {top.card.rarity ? ` · ${top.card.rarity}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">Matched on: {top.reasons.join(", ").toLowerCase()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openCard(top.card, scan.scan.scanId)} className="rounded-xl bg-brand-700 px-5 py-3 text-lg font-semibold text-white hover:bg-brand-800">
                  Yes, show prices
                </button>
                <button onClick={() => setScan({ ...scan, showAll: true })} className="rounded-xl border border-slate-300 px-4 py-3 font-medium">
                  No, show other matches
                </button>
              </div>
            </div>
          </section>
        )}

        {scan.kind === "done" && scan.scan.match.candidates.length > 0 && (!confident || scan.showAll) && (
          <section aria-labelledby="which-h" className="grid gap-3">
            <div>
              <h2 id="which-h" className="text-xl font-semibold">Which one is yours?</h2>
              <p className="text-sm text-slate-700">
                {scan.scan.match.ambiguous || scan.scan.match.duplicatePrintings
                  ? "A few printings look alike. Check the set name and the number at the bottom of your card."
                  : "Tap the card that matches."}
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {scan.scan.match.candidates.map((c) => (
                <li key={c.card.catalogId}>
                  <button
                    onClick={() => openCard(c.card, scan.scan.scanId)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-700"
                  >
                    <CardArt card={c.card} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.card.name}</span>
                      <span className="block text-sm text-slate-700">
                        {c.card.setName} · #{c.card.number}
                        {c.card.setPrintedTotal ? `/${c.card.setPrintedTotal}` : ""}
                      </span>
                      <span className="block text-xs text-slate-600">{c.confidence === "high" ? "Strong match" : c.confidence === "medium" ? "Possible match" : "Weak match"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-700">
              Not here?{" "}
              <button className="font-medium text-brand-700 underline" onClick={() => setCamera(true)}>Scan again</button> or type it in the search bar.
            </p>
          </section>
        )}
      </div>

      {(searching || searchError || results) && (
        <section aria-labelledby="results-h" className="grid gap-3" aria-live="polite">
          <h2 id="results-h" className="text-xl font-semibold">
            {searching ? "Searching…" : results ? `${results.length} card${results.length === 1 ? "" : "s"} found` : "Search"}
          </h2>
          {searchError && <p role="alert" className="text-red-800">{searchError}</p>}
          {results && results.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white p-4">No cards found. Check the spelling, or try the number printed at the bottom of the card.</p>
          )}
          {results && results.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((c) => (
                <li key={c.catalogId}>
                  <button onClick={() => openCard(c)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-700">
                    <CardArt card={c} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-sm text-slate-700">
                        {c.setName} · #{c.number}
                        {c.setPrintedTotal ? `/${c.setPrintedTotal}` : ""}
                      </span>
                      {c.rarity && <span className="block text-xs text-slate-600">{c.rarity}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <CameraScanner open={camera} onClose={closeCamera} onImage={onImage} />
    </div>
  );
}
