"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { ApiError, CardSummary, ScanResponse, SearchResponse } from "@/lib/api-types";
import { CONDITIONS, FINISH_LABELS, LANGUAGES, type Condition, type Finish, type Grading, type Language } from "@/lib/types";
import { CardThumb } from "./CardThumb";

type Candidate = { card: CardSummary; reasons: string[] };
type Status = { kind: "idle" } | { kind: "busy"; label: string } | { kind: "error"; message: string; retry?: () => void };

const ALL_FINISHES = Object.keys(FINISH_LABELS) as Finish[];

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as ApiError | null;
  if (res.status === 429) {
    const after = res.headers.get("retry-after");
    return `${body?.error.message ?? "Too many requests."}${after ? ` Try again in about ${after} s.` : ""}`;
  }
  return body?.error.message ?? `Request failed (${res.status}).`;
}

/** Only transient failures get a Retry button; a bad file or query won't improve by resending. */
const retryable = (res: Response) => res.status === 429 || res.status >= 500;

export function ScannerFlow() {
  const router = useRouter();
  const ids = { file: useId(), search: useId(), cands: useId() };
  const searchRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candidateSource, setCandidateSource] = useState<"scan" | "search">("scan");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<CardSummary | null>(null);

  async function uploadImage(file: File) {
    setChosen(null);
    setCandidates(null);
    setScan(null);
    setStatus({ kind: "busy", label: "Reading your card…" });
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/scan", { method: "POST", body: form });
      if (!res.ok) {
        setStatus({ kind: "error", message: await readError(res), retry: retryable(res) ? () => uploadImage(file) : undefined });
        return;
      }
      const data = (await res.json()) as ScanResponse;
      setScan(data);
      setCandidateSource("scan");
      setCandidates(data.match.candidates);
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", message: "Network error. Check your connection.", retry: () => uploadImage(file) });
    }
  }

  async function runSearch(q: string) {
    setChosen(null);
    setStatus({ kind: "busy", label: "Searching the catalog…" });
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setStatus({ kind: "error", message: await readError(res), retry: retryable(res) ? () => runSearch(q) : undefined });
        return;
      }
      const data = (await res.json()) as SearchResponse;
      setCandidateSource("search");
      setCandidates(data.results.slice(0, 20).map((card) => ({ card, reasons: [] })));
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", message: "Network error. Check your connection.", retry: () => runSearch(q) });
    }
  }

  function noneOfThese() {
    setCandidates(null);
    setChosen(null);
    searchRef.current?.focus();
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="intro" className="space-y-2">
        <h1 id="intro" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Scan a Pokémon card. Confirm it. See US &amp; EU reference prices.
        </h1>
        <p className="max-w-2xl text-slate-700">
          We read the name and collector number, suggest likely printings, and you confirm the exact one. Prices are
          source-attributed references in their original currency, not live listings.
        </p>
      </section>

      <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="scan-h" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="scan-h" className="text-lg font-semibold">
            1 · Photograph or upload
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Lay the card flat, avoid glare, and keep the bottom corner with the collector number in view.
          </p>
          <label
            htmlFor={ids.file}
            className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-3 font-medium text-white hover:bg-brand-800 focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-600"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Take photo or choose image
          </label>
          <input
            id={ids.file}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="scan-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadImage(f);
            }}
          />
          <p className="mt-2 text-xs text-slate-500">JPEG, PNG or WebP up to 8 MB. Photos are processed in memory and not stored.</p>
        </section>

        <section aria-labelledby="search-h" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="search-h" className="text-lg font-semibold">
            …or search by name / number
          </h2>
          <form
            className="mt-4 flex gap-2"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim().length >= 2) void runSearch(query.trim());
            }}
          >
            <label htmlFor={ids.search} className="sr-only">
              Card name or collector number
            </label>
            <input
              id={ids.search}
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Pikachu 025/198"
              minLength={2}
              maxLength={60}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-lg border border-brand-700 px-4 py-2.5 font-medium text-brand-700 hover:bg-brand-50"
            >
              Search
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Works without a photo. Add the number to narrow reprints.</p>
        </section>
      </div>

      <div aria-live="polite" role="status">
        {status.kind === "busy" && (
          <p className="flex items-center gap-2 text-slate-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden="true" />
            {status.label}
          </p>
        )}
      </div>
      {status.kind === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <p className="flex-1">{status.message}</p>
          {status.retry && (
            <button onClick={status.retry} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
              Retry
            </button>
          )}
        </div>
      )}
      </div>

      {scan && candidateSource === "scan" && (
        <section aria-label="What we read" className="space-y-2">
          {scan.notice && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{scan.notice}</p>}
          <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Text we read: {scan.ocr.parsed.name ?? "no name"} · {scan.ocr.parsed.number ?? "no number"}
              {scan.ocr.parsed.languageHint ? ` · looks ${scan.ocr.parsed.languageHint}` : ""}
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-700">
              {scan.ocr.lines.join("\n") || "(nothing recognized)"}
            </pre>
          </details>
        </section>
      )}

      {candidates && !chosen && (
        <section aria-labelledby={ids.cands} className="space-y-3">
          <h2 id={ids.cands} className="text-lg font-semibold">
            2 · Pick the exact printing
          </h2>
          {candidateSource === "scan" && scan && (
            <p className={`text-sm ${scan.match.ambiguous ? "font-medium text-amber-800" : "text-slate-700"}`}>
              {scan.match.message}
            </p>
          )}
          {candidates.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
              No matching cards. Check the spelling or try the collector number (e.g. “25/198”).
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" data-testid="candidates">
              {candidates.map(({ card, reasons }) => (
                <li key={card.catalogId} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <CardThumb name={card.name} setName={card.setName} number={card.number} imageUrl={card.imageUrl} size="sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-sm text-slate-700">
                      {card.setName}
                      {card.setCode ? ` (${card.setCode})` : ""} · No. {card.number}
                      {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
                    </p>
                    {card.rarity && <p className="text-xs text-slate-600">{card.rarity}</p>}
                    {reasons.length > 0 && (
                      <ul className="text-xs text-slate-600" aria-label="Why this matched">
                        {reasons.map((r) => (
                          <li key={r}>✓ {r}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => setChosen(card)}
                      className="mt-1 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
                      aria-label={`Select ${card.name}, ${card.setName} number ${card.number}`}
                    >
                      This is my card
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={noneOfThese} className="text-sm font-medium text-brand-700 underline underline-offset-2">
            None of these: search manually
          </button>
        </section>
      )}

      {chosen && (
        <ConfirmPanel
          card={chosen}
          languageHint={candidateSource === "scan" ? scan?.ocr.parsed.languageHint ?? null : null}
          onBack={() => setChosen(null)}
          onConfirm={(sel) => {
            if (scan?.scanId && candidateSource === "scan") {
              void fetch(`/api/scans/${scan.scanId}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ catalogId: chosen.catalogId }),
              }).catch(() => undefined);
            }
            const params = new URLSearchParams(sel);
            router.push(`/cards/${encodeURIComponent(chosen.catalogId)}?${params.toString()}`);
          }}
        />
      )}
    </div>
  );
}

function ConfirmPanel({
  card,
  languageHint,
  onBack,
  onConfirm,
}: {
  card: CardSummary;
  languageHint: string | null;
  onBack: () => void;
  onConfirm: (sel: { finish: Finish; language: Language; grading: Grading; condition: Condition }) => void;
}) {
  const finishes = card.finishes.length > 0 ? card.finishes : ALL_FINISHES;
  const initialLang = (LANGUAGES as readonly string[]).includes(languageHint ?? "") ? (languageHint as Language) : "English";
  const [finish, setFinish] = useState<Finish | "">(finishes.length === 1 ? (finishes[0] ?? "") : "");
  const [language, setLanguage] = useState<Language>(initialLang);
  const [grading, setGrading] = useState<Grading>("raw");
  const [condition, setCondition] = useState<Condition>("Near Mint");
  const [checked, setChecked] = useState(false);
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    ref.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [card.catalogId]);

  return (
    <section ref={ref} aria-labelledby={`${id}-h`} className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} tabIndex={-1} className="scroll-mt-4 text-lg font-semibold">
        3 · Confirm the details
      </h2>
      <div className="mt-3 flex gap-4">
        <CardThumb name={card.name} setName={card.setName} number={card.number} imageUrl={card.imageUrl} />
        <div className="text-sm">
          <p className="text-base font-semibold">{card.name}</p>
          <p>
            {card.setName}
            {card.setCode ? ` (${card.setCode})` : ""}
          </p>
          <p>
            Collector no. {card.number}
            {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
          </p>
          {card.rarity && <p className="text-slate-600">{card.rarity}</p>}
          <button onClick={onBack} className="mt-2 text-brand-700 underline underline-offset-2">
            Choose a different card
          </button>
        </div>
      </div>

      <form
        className="mt-5 grid gap-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (finish && checked) onConfirm({ finish, language, grading, condition });
        }}
      >
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Finish (check the card, since photos can’t tell reliably)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {finishes.map((f) => (
              <label
                key={f}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${finish === f ? "border-brand-700 bg-brand-50" : "border-slate-300"}`}
              >
                <input type="radio" name="finish" value={f} checked={finish === f} onChange={() => setFinish(f)} required />
                {FINISH_LABELS[f]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-sm font-medium">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Raw or graded</legend>
          <div className="mt-2 flex gap-2">
            {(["raw", "graded"] as const).map((g) => (
              <label
                key={g}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${grading === g ? "border-brand-700 bg-brand-50" : "border-slate-300"}`}
              >
                <input type="radio" name="grading" value={g} checked={grading === g} onChange={() => setGrading(g)} />
                {g === "raw" ? "Raw (ungraded)" : "Graded slab"}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-sm font-medium">
          Condition
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
          >
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} required className="mt-1" />
          <span>I checked that the set symbol and collector number on my card match this printing.</span>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!finish || !checked}
            className="w-full rounded-lg bg-brand-700 px-4 py-3 font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            Confirm and view references
          </button>
        </div>
      </form>
    </section>
  );
}
