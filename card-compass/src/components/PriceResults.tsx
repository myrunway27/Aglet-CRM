"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError, readJson, type PricesResponse } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { formatMinor } from "@/lib/money";
import { groupByFinish, subtypeLabel, SOURCES, type PriceReference, type SourceStatus } from "@/lib/prices";
import { CONDITIONS, LANGUAGES, selectionToQuery, type Selection } from "@/lib/selection";
import { CardActions } from "./CardActions";
import { OffersSection } from "./OffersSection";
import { CardArt } from "./CardArt";
import { DemoBanner } from "./DemoBanner";
import { PreferenceSelector, REGIONS, useRegion } from "./PreferenceSelector";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: PricesResponse }
  | { kind: "error"; status: number; message: string; retryAfter?: number };

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

function RefTable({ caption, rows }: { caption: string; rows: PriceReference[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="pb-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Price type</th>
          <th scope="col">Amount (original currency)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.finish}-${r.subtype}`} className="border-t border-slate-100">
            <th scope="row" className="py-1.5 pr-2 font-normal text-slate-700">
              {subtypeLabel(r.subtype)}
            </th>
            <td className="py-1.5 text-right font-mono font-semibold tabular-nums text-slate-900">
              {formatMinor(r.amountMinor, r.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SourcePanel({
  status,
  refs,
  finish,
  isDemo,
}: {
  status: SourceStatus;
  refs: PriceReference[];
  finish: string;
  isDemo: boolean;
}) {
  const meta = SOURCES[status.source];
  const g = groupByFinish(refs, finish);
  return (
    <section
      aria-labelledby={`src-${status.source}`}
      className="grid content-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid={`source-${status.source}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`src-${status.source}`} className="text-base font-semibold">
            {meta.label} <span className="font-normal text-slate-600">· {meta.region} · {meta.currency}</span>
          </h3>
          <p className="text-xs text-slate-600">
            Source: {meta.label} via Pokémon TCG API{isDemo ? " (demo fixture)" : ""}
            {status.observedAt && <> · Updated {fmtDate(status.observedAt)}</>}
          </p>
        </div>
        {status.stale && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Possibly stale</span>
        )}
      </header>

      {status.status === "no-quote" ? (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800">
          No quote available from {meta.label} for this card.
        </p>
      ) : (
        <>
          {g.exact.length > 0 ? (
            <RefTable caption={finishLabel(finish)} rows={g.exact} />
          ) : (
            finish !== "other" && (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800">
                No quote available for the {finishLabel(finish).toLowerCase()} finish.
              </p>
            )
          )}
          {g.notFinishSpecific.length > 0 && <RefTable caption="Not finish-specific" rows={g.notFinishSpecific} />}
          {g.otherFinishes.length > 0 && (
            <details className="rounded-md border border-slate-200 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">
                Other finishes (not the one you confirmed)
              </summary>
              <div className="mt-2 grid gap-3">
                {[...new Set(g.otherFinishes.map((r) => r.finish))].map((f) => (
                  <RefTable key={f} caption={finishLabel(f)} rows={g.otherFinishes.filter((r) => r.finish === f)} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
      {status.sourceCardUrl && (
        <a
          href={status.sourceCardUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="justify-self-start text-sm font-medium text-brand-700 underline"
        >
          View on {meta.label} <span className="sr-only">(opens in a new tab)</span>↗
        </a>
      )}
    </section>
  );
}

export function PriceResults({
  cardId,
  selection,
  signedIn,
  offersEnabled,
}: {
  cardId: string;
  selection: Selection;
  signedIn: boolean;
  offersEnabled: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [region] = useRegion();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await readJson<PricesResponse>(await fetch(`/api/cards/${encodeURIComponent(cardId)}/prices`));
      setState({ kind: "ok", data });
    } catch (err) {
      if (err instanceof ClientApiError) {
        setState({ kind: "error", status: err.status, message: err.message, retryAfter: err.retryAfterSeconds });
      } else setState({ kind: "error", status: 0, message: "Network error. Check your connection." });
    }
  }, [cardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" aria-live="polite" className="grid gap-4">
        <p className="sr-only">Loading price references…</p>
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
        <h1 className="text-lg font-semibold">
          {state.status === 404
            ? "Card not found"
            : state.status === 429
              ? "Too many requests right now"
              : "Price references are unavailable"}
        </h1>
        <p>
          {state.message}
          {state.status === 429 && state.retryAfter ? ` Try again in about ${state.retryAfter}s.` : ""}
        </p>
        <div className="flex gap-3">
          {state.status !== 404 && (
            <button onClick={load} className="rounded-md bg-red-800 px-3 py-2 font-medium text-white">
              Retry
            </button>
          )}
          <Link href="/" className="rounded-md border border-red-800 px-3 py-2 font-medium">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const { data } = state;
  const { card } = data;
  const isDemo = data.mode === "mock";
  const preferred = REGIONS[region].currency;
  const orderedSources = [...data.sources].sort(
    (a, b) => Number(b.currency === preferred) - Number(a.currency === preferred),
  );
  const notices = [...data.notices];
  if (selection.lang !== "en")
    notices.push(
      `You confirmed a ${LANGUAGES[selection.lang]} card. These references come from a catalog of English-language printings; ${LANGUAGES[selection.lang]} printings usually sell at different prices.`,
    );
  if (selection.grading === "graded")
    notices.push(
      `You confirmed a ${selection.grader} ${selection.grade} graded card. These references are for ungraded (raw) copies and do not reflect graded prices.`,
    );
  else if (selection.condition && selection.condition !== "NM")
    notices.push(
      `You confirmed ${CONDITIONS[selection.condition]} condition. These references are not condition-specific, and played copies typically sell below them.`,
    );
  if (selection.finish === "other")
    notices.push("You weren't sure of the finish, so no finish-specific reference is highlighted.");

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-sm font-medium text-brand-700 underline">
        ← Scan or search another card
      </Link>

      {isDemo && <DemoBanner />}

      <section aria-labelledby="card-h" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <CardArt card={card} size="lg" />
        <div className="grid content-start gap-2">
          <h1 id="card-h" className="text-2xl font-bold">
            {card.name}
          </h1>
          <p className="text-slate-700">
            {card.setName} · #{card.number}
            {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
            {card.rarity ? ` · ${card.rarity}` : ""}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-600">Finish</dt>
            <dd>{finishLabel(selection.finish)}</dd>
            <dt className="text-slate-600">Language</dt>
            <dd>{LANGUAGES[selection.lang]}</dd>
            <dt className="text-slate-600">{selection.grading === "raw" ? "Condition" : "Grade"}</dt>
            <dd>
              {selection.grading === "raw"
                ? `Raw · ${selection.condition ? CONDITIONS[selection.condition] : "—"}`
                : `${selection.grader} ${selection.grade}`}
            </dd>
          </dl>
          <p className="text-xs text-slate-600">Catalog ID: {card.catalogId}</p>
        </div>
      </section>

      {notices.length > 0 && (
        <ul className="grid gap-2">
          {notices.map((n) => (
            <li key={n} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {n}
            </li>
          ))}
        </ul>
      )}

      <PreferenceSelector />

      <section aria-labelledby="refs-h" className="grid gap-3">
        <div>
          <h2 id="refs-h" className="text-xl font-semibold">
            Market references
          </h2>
          <p className="text-sm text-slate-700">
            Informational reference prices reported by each marketplace, shown in their original currency. They are
            not live listings, may be stale, and are not comparable across currencies or price types, so we don&apos;t
            rank them or pick a &quot;cheapest&quot;.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {orderedSources.map((s) => (
            <SourcePanel
              key={s.source}
              status={s}
              refs={data.references.filter((r) => r.source === s.source)}
              finish={selection.finish}
              isDemo={isDemo}
            />
          ))}
        </div>
        <p className="text-xs text-slate-600">
          Retrieved {fmtDate(data.fetchedAt)}
          {data.servedFrom === "stored" ? " from our last stored copy" : ""}. Price data via the Pokémon TCG API
          (pokemontcg.io). Check source terms before relying on these figures.
        </p>
      </section>

      {offersEnabled && <OffersSection cardId={cardId} selection={selection} region={region} />}

      <CardActions
        cardId={cardId}
        selection={selection}
        references={data.references}
        signedIn={signedIn}
        returnTo={`/cards/${encodeURIComponent(cardId)}?${selectionToQuery(selection)}`}
      />
    </div>
  );
}
