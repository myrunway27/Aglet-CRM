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

const FAN: CatalogCard[] = [
  { name: "Mew", number: "151", rarity: "Rare Holo" },
  { name: "Charizard ex", number: "125", rarity: "Double Rare" },
  { name: "Pikachu", number: "25", rarity: "Common" },
].map((c, i) => ({
  ...c,
  catalogId: `fan-${i}`,
  setId: "fan",
  setName: "",
  setSeries: null,
  setPrintedTotal: null,
  setPtcgoCode: null,
  releaseDate: null,
  imageSmall: null,
  imageLarge: null,
  finishes: [],
}));

/** Decorative fan of cards beside the search (desktop only). */
function HeroCards() {
  return (
    <div aria-hidden className="pointer-events-none relative hidden h-64 self-center md:col-start-2 md:row-start-1 md:block">
      {FAN.map((c, i) => (
        <div
          key={c.catalogId}
          className="absolute top-3 left-1/2 origin-bottom"
          style={{ transform: `translateX(-50%) translateX(${(i - 1) * 40}px) rotate(${(i - 1) * 9}deg)`, zIndex: i === 1 ? 2 : 1 }}
        >
          <CardArt card={c} size="md" />
        </div>
      ))}
    </div>
  );
}

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
      <section
        aria-labelledby="find-h"
        className="relative -mx-4 grid grid-cols-[minmax(0,1fr)] gap-5 overflow-hidden border-b border-line bg-surface px-4 pt-6 pb-7 sm:mx-0 sm:rounded-3xl sm:border sm:p-10 md:grid-cols-[minmax(0,1fr)_280px]"
        style={{ backgroundImage: "var(--hero-glow)" }}
      >
        <HeroCards />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:col-start-1 md:row-start-1">
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Pokémon TCG price checker</p>
          <h1 id="find-h" className="font-display text-[2.1rem] leading-[1.05] font-extrabold sm:text-5xl">
            Find any Pokémon card
          </h1>
          <p className="max-w-md text-base text-ink-2 sm:text-lg">Type a name or number, or scan the card with your camera.</p>
        </div>

        {/* Search bar with a scan button inside */}
        <div className="relative">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="flex items-center gap-2 rounded-2xl border-2 border-line-strong bg-surface py-1.5 pr-1.5 pl-3.5 shadow-lg shadow-black/5 transition-colors focus-within:border-ink"
          >
            <span className="text-muted">
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
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-on-primary shadow-sm hover:bg-primary-hover active:translate-y-px"
            >
              <CameraIcon />
              Scan
            </button>
          </form>

          {open && suggestions.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-20 mt-1 max-h-96 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
              {suggestions.map((c, idx) => (
                <li
                  key={c.catalogId}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={idx === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openCard(c)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 ${idx === active ? "bg-primary-soft" : "hover:bg-surface-2"}`}
                >
                  <CardArt card={c} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-ink-2">
                      {c.setName} · #{c.number}
                      {c.setPrintedTotal ? `/${c.setPrintedTotal}` : ""}
                    </span>
                    {c.rarity && <span className="block text-xs text-muted">{c.rarity}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["/scan/bulk", "Scan a stack"],
            ["/graded", "Add a PSA slab"],
            ["/market", "What's moving"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 font-medium text-ink-2 hover:border-line-strong hover:text-ink">
              {label} <span aria-hidden>→</span>
            </Link>
          ))}
        </div>

        {recent.length > 0 && scan.kind === "idle" && !results && (
          <div className="grid gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recently viewed</h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <Link
                  key={r.catalogId}
                  href={`/cards/${encodeURIComponent(r.catalogId)}`}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-ink"
                >
                  {r.name} <span className="text-muted">· {r.setName} #{r.number}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        </div>
      </section>

      {initialMode === "mock" && <DemoBanner />}

      {scan.kind === "idle" && !results && !searching && (
        <section aria-labelledby="how-h" className="grid gap-3">
          <h2 id="how-h" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">How it works</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ["Scan or search", "Point your camera at the card, or type its name or the number at the bottom."],
              ["Confirm in one tap", "We show the printing we found. Tap yes, or pick the right one if a few look alike."],
              ["See what it's worth", "Prices from TCGplayer, Cardmarket and recent sales, plus listings delivered to you."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-extrabold text-on-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-display font-bold">{t}</span>
                  <span className="block text-sm text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div ref={scanRef} aria-live="polite" className="scroll-mt-4">
        {scan.kind === "reading" && (
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- local photo preview */}
            <img src={scan.preview} alt="Your photo" className="h-24 w-16 rounded object-cover" />
            <p className="flex items-center gap-2 text-lg font-medium">
              <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              Reading your card…
            </p>
          </div>
        )}

        {scan.kind === "error" && (
          <div role="alert" className="grid gap-3 rounded-2xl border border-bad-line bg-bad-soft p-4 text-bad">
            <p className="font-semibold">{scan.message}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCamera(true)} className="rounded-lg bg-bad-solid px-3 py-2 font-medium text-white">Try again</button>
              <button onClick={() => setScan({ kind: "idle" })} className="rounded-lg border border-bad px-3 py-2 font-medium">Cancel</button>
            </div>
          </div>
        )}

        {scan.kind === "done" && scan.scan.match.candidates.length === 0 && (
          <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-xl font-semibold">We couldn&apos;t read that card</h2>
            <ul className="list-disc pl-5 text-ink-2">
              <li>Fill the frame with the whole card and hold still</li>
              <li>Tilt it slightly to get rid of glare</li>
              <li>Or type the name or the number at the bottom (like 025/198) in the search bar</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCamera(true)} className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary">Scan again</button>
              <button
                onClick={() => {
                  setScan({ kind: "idle" });
                  document.getElementById("q")?.focus();
                }}
                className="rounded-lg border border-line-strong px-4 py-2 font-medium"
              >
                Type instead
              </button>
            </div>
          </div>
        )}

        {scan.kind === "done" && top && confident && !scan.showAll && (
          <section aria-labelledby="match-h" className="flex gap-4 rounded-2xl border-2 border-ink bg-surface p-4">
            <CardArt card={top.card} size="md" />
            <div className="grid min-w-0 content-start gap-3">
              <h2 id="match-h" className="text-sm font-semibold uppercase tracking-wide text-link">Is this your card?</h2>
              <div>
                <p className="text-2xl font-bold">{top.card.name}</p>
                <p className="text-ink-2">
                  {top.card.setName} · #{top.card.number}
                  {top.card.setPrintedTotal ? `/${top.card.setPrintedTotal}` : ""}
                  {top.card.rarity ? ` · ${top.card.rarity}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted">Matched on: {top.reasons.join(", ").toLowerCase()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openCard(top.card, scan.scan.scanId)} className="rounded-xl bg-primary px-5 py-3 text-lg font-semibold text-on-primary hover:bg-primary-hover">
                  Yes, show prices
                </button>
                <button onClick={() => setScan({ ...scan, showAll: true })} className="rounded-xl border border-line-strong px-4 py-3 font-medium">
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
              <p className="text-sm text-ink-2">
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
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:border-ink"
                  >
                    <CardArt card={c.card} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.card.name}</span>
                      <span className="block text-sm text-ink-2">
                        {c.card.setName} · #{c.card.number}
                        {c.card.setPrintedTotal ? `/${c.card.setPrintedTotal}` : ""}
                      </span>
                      <span className="block text-xs text-muted">{c.confidence === "high" ? "Strong match" : c.confidence === "medium" ? "Possible match" : "Weak match"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-2">
              Not here?{" "}
              <button className="font-medium text-link underline" onClick={() => setCamera(true)}>Scan again</button> or type it in the search bar.
            </p>
          </section>
        )}
      </div>

      {(searching || searchError || results) && (
        <section aria-labelledby="results-h" className="grid gap-3" aria-live="polite">
          <h2 id="results-h" className="text-xl font-semibold">
            {searching ? "Searching…" : results ? `${results.length} card${results.length === 1 ? "" : "s"} found` : "Search"}
          </h2>
          {searchError && <p role="alert" className="text-bad">{searchError}</p>}
          {results && results.length === 0 && (
            <p className="rounded-xl border border-line bg-surface p-4">No cards found. Check the spelling, or try the number printed at the bottom of the card.</p>
          )}
          {results && results.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((c) => (
                <li key={c.catalogId}>
                  <button onClick={() => openCard(c)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:border-ink">
                    <CardArt card={c} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-sm text-ink-2">
                        {c.setName} · #{c.number}
                        {c.setPrintedTotal ? `/${c.setPrintedTotal}` : ""}
                      </span>
                      {c.rarity && <span className="block text-xs text-muted">{c.rarity}</span>}
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
