"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ClientApiError, readJson, type ScanResponse, type SearchResponse } from "@/lib/api-types";
import type { CatalogCard } from "@/lib/catalog/types";
import { isNative, takeNativePhoto } from "@/lib/native";
import { CandidateList } from "./CandidateList";
import { ConfirmForm } from "./ConfirmForm";
import { DemoBanner } from "./DemoBanner";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; message: string }
  | { kind: "error"; message: string; retryAfter?: number; retry?: () => void };

function toStatus(err: unknown, retry?: () => void): Status {
  if (err instanceof ClientApiError) {
    return {
      kind: "error",
      message: err.status === 429 ? `${err.message} (try again in about ${err.retryAfterSeconds ?? 60}s)` : err.message,
      retryAfter: err.retryAfterSeconds,
      retry,
    };
  }
  return { kind: "error", message: "Network error. Check your connection and try again.", retry };
}

export function Home({ initialMode }: { initialMode: "mock" | "live" }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const [mode, setMode] = useState<"mock" | "live">(initialMode);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  async function upload(file: File) {
    setStatus({ kind: "busy", message: "Reading your card…" });
    setSelected(null);
    setSearch(null);
    const form = new FormData();
    form.set("image", file);
    try {
      const data = await readJson<ScanResponse>(await fetch("/api/scan", { method: "POST", body: form }));
      setScan(data);
      setMode(data.mode);
      if (data.parsed.name) setQuery(data.parsed.name);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus(toStatus(err, () => upload(file)));
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same photo
    if (file) void upload(file);
  }

  async function runSearch(q: string) {
    setStatus({ kind: "busy", message: "Searching the catalog…" });
    setSelected(null);
    try {
      const data = await readJson<SearchResponse>(await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`));
      setSearch(data);
      setMode(data.mode);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus(toStatus(err, () => runSearch(q)));
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) void runSearch(query.trim());
    else setStatus({ kind: "error", message: "Enter at least 2 characters to search." });
  }

  function noneOfThese() {
    setSelected(null);
    setScan(null);
    searchRef.current?.focus();
  }

  const candidates = scan?.match.candidates ?? [];

  return (
    <div className="grid gap-6">
      <section aria-labelledby="intro" className="grid gap-2">
        <h1 id="intro" className="text-2xl font-bold tracking-tight sm:text-3xl">
          What is my Pokémon card worth?
        </h1>
        <p className="max-w-2xl text-slate-700">
          Photograph a card, confirm the exact printing, and compare source-attributed reference prices
          from the US (TCGplayer, USD) and EU (Cardmarket, EUR). No sign-up. Photos are processed in memory
          and not stored.
        </p>
      </section>

      {mode === "mock" && <DemoBanner />}

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="scan-h" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="scan-h" className="text-lg font-semibold">
            Scan a card
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Lay the card flat in good light, avoid glare, and fill the frame. JPEG, PNG or WebP up to 8 MB.
          </p>
          <label
            htmlFor="card-photo"
            onClick={(e) => {
              if (!isNative()) return;
              e.preventDefault(); // use the native camera inside the app
              void takeNativePhoto().then((f) => f && upload(f));
            }}
            className="mt-3 flex cursor-pointer items-center justify-center rounded-md bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-800 focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-700"
          >
            Take photo or upload
            <input
              ref={fileRef}
              id="card-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              capture="environment"
              onChange={onFile}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-sm text-slate-700">
            Scanning a stack?{" "}
            <Link href="/scan/bulk" className="font-medium text-brand-700 underline">
              Bulk scan
            </Link>
            {" · "}Have a PSA slab?{" "}
            <Link href="/graded" className="font-medium text-brand-700 underline">
              Add by cert number
            </Link>
          </p>
        </section>

        <section aria-labelledby="search-h" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="search-h" className="text-lg font-semibold">
            Search manually
          </h2>
          <p className="mt-1 text-sm text-slate-700">By name (e.g. Pikachu) or collector number (e.g. 025/198).</p>
          <form onSubmit={onSearch} role="search" className="mt-3 flex gap-2">
            <label htmlFor="q" className="sr-only">
              Card name or number
            </label>
            <input
              ref={searchRef}
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
              placeholder="Pikachu or 025/198"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base"
            />
            <button type="submit" className="rounded-md border border-brand-700 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50">
              Search
            </button>
          </form>
        </section>
      </div>

      <div aria-live="polite" className="min-h-0">
        {status.kind === "busy" && (
          <p className="flex items-center gap-2 text-slate-700">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
            {status.message}
          </p>
        )}
        {status.kind === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{status.message}</span>
            {status.retry && (
              <button onClick={status.retry} className="rounded border border-red-800 px-2 py-1 font-medium">
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {scan && (
        <section aria-labelledby="review-h" className="grid gap-3">
          <h2 id="review-h" className="text-xl font-semibold">
            Review matches
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-slate-100 px-3 py-2 text-sm">
            <dt className="text-slate-600">Name read</dt>
            <dd>{scan.parsed.name ?? "—"}</dd>
            <dt className="text-slate-600">Number read</dt>
            <dd>{scan.parsed.rawNumber ?? "—"}</dd>
          </dl>
          {[...scan.ocr.warnings, ...scan.parsed.notes].map((w) => (
            <p key={w} className="text-sm text-slate-700">
              ⓘ {w}
            </p>
          ))}
          {candidates.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-800">
              No catalog match. Try a clearer photo, or search manually above.
            </p>
          ) : (
            <>
              {(scan.match.ambiguous || scan.match.duplicatePrintings) && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Several printings look alike. Compare the set name, set symbol and number carefully.
                </p>
              )}
              <CandidateList
                name="scan-candidate"
                legend="Pick the card that matches yours (nothing is selected until you choose)"
                items={candidates.map((c) => ({ card: c.card, candidate: c }))}
                selectedId={selected?.catalogId ?? null}
                onSelect={setSelected}
              />
            </>
          )}
          <button onClick={noneOfThese} className="justify-self-start text-sm font-medium text-brand-700 underline">
            None of these — search manually
          </button>
        </section>
      )}

      {search && (
        <section aria-labelledby="results-h" className="grid gap-3">
          <h2 id="results-h" className="text-xl font-semibold">
            Search results
          </h2>
          {search.results.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-3 py-3">No cards found. Check spelling or try the collector number.</p>
          ) : (
            <CandidateList
              name="search-candidate"
              legend={`${search.results.length} card${search.results.length === 1 ? "" : "s"} found — pick yours`}
              items={search.results.map((card) => ({ card }))}
              selectedId={selected?.catalogId ?? null}
              onSelect={setSelected}
            />
          )}
        </section>
      )}

      {selected && (
        <div ref={confirmRef} className="scroll-mt-4">
          <ConfirmForm key={selected.catalogId} card={selected} scanId={scan?.scanId ?? null} />
        </div>
      )}
    </div>
  );
}
