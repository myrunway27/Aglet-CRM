"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError, readJson, type PricesResponse } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { formatMinor } from "@/lib/money";
import { groupByFinish, subtypeLabel, SOURCES, type PriceReference, type SourceStatus } from "@/lib/prices";
import { CONDITIONS, LANGUAGES, selectionToQuery, type Selection, type SelectionField } from "@/lib/selection";
import { CardActions } from "./CardActions";
import { OffersSection } from "./OffersSection";
import { SelectionBar } from "./SelectionBar";
import { PriceHistory } from "./PriceHistory";
import { subtypeForGrade } from "@/lib/pricecharting/match";
import { CardArt } from "./CardArt";
import { DemoBanner } from "./DemoBanner";
import { REGIONS, useRegion } from "./PreferenceSelector";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: PricesResponse }
  | { kind: "error"; status: number; message: string; retryAfter?: number };

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

function RefTable({ caption, rows, highlight }: { caption: string; rows: PriceReference[]; highlight?: string | null }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="pb-1 text-left text-xs font-semibold uppercase tracking-wide text-muted">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Price type</th>
          <th scope="col">Amount (original currency)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.finish}-${r.subtype}`} className={`border-t border-line ${highlight === r.subtype ? "bg-primary-soft" : ""}`}>
            <th scope="row" className="py-1.5 pr-2 font-normal text-ink-2">
              {subtypeLabel(r.subtype)}
              {highlight === r.subtype && <span className="ml-1 text-xs font-semibold text-link">· your card</span>}
            </th>
            <td className="py-1.5 text-right font-mono font-semibold tabular-nums text-ink">
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
  highlight,
}: {
  status: SourceStatus;
  refs: PriceReference[];
  finish: string;
  isDemo: boolean;
  highlight?: string | null;
}) {
  const meta = SOURCES[status.source];
  const g = groupByFinish(refs, finish);
  return (
    <section
      aria-labelledby={`src-${status.source}`}
      className="grid content-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm"
      data-testid={`source-${status.source}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`src-${status.source}`} className="text-base font-semibold">
            {meta.label} <span className="font-normal text-muted">· {meta.region} · {meta.currency}</span>
          </h3>
          <p className="text-xs text-muted">
            {status.source === "pricecharting"
              ? `Source: PriceCharting, based on completed sales${refs[0]?.isDemo ? " (demo fixture)" : ""}`
              : `Source: ${meta.label} via Pokémon TCG API${isDemo ? " (demo fixture)" : ""}`}
            {status.observedAt && <> · Updated {fmtDate(status.observedAt)}</>}
          </p>
        </div>
        {status.stale && (
          <span className="rounded bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Possibly stale</span>
        )}
      </header>

      {status.status === "no-quote" ? (
        <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-ink">
          No quote available from {meta.label} for this card.
          {status.note && <span className="block text-xs text-muted">{status.note}.</span>}
        </p>
      ) : (
        <>
          {g.exact.length > 0 ? (
            <RefTable caption={finishLabel(finish)} rows={g.exact} highlight={highlight} />
          ) : (
            finish !== "other" && (
              <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-ink">
                No quote available for the {finishLabel(finish).toLowerCase()} finish.
              </p>
            )
          )}
          {g.notFinishSpecific.length > 0 && <RefTable caption="Not finish-specific" rows={g.notFinishSpecific} />}
          {g.otherFinishes.length > 0 && (
            <details className="rounded-lg border border-line px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-ink">
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
          className="justify-self-start text-sm font-medium text-link underline"
        >
          View on {meta.label} <span className="sr-only">(opens in a new tab)</span>↗
        </a>
      )}
    </section>
  );
}

/** The one headline number per source for this exact card, each labelled with what it is. */
function QuickPrices({ data, selection }: { data: PricesResponse; selection: Selection }) {
  const find = (source: string, finish: string, subtype: string) =>
    data.references.find((r) => r.source === source && r.finish === finish && r.subtype === subtype);
  const graded = selection.grading === "graded";
  const pcSub = graded ? subtypeForGrade(selection.grader, selection.grade) : "ungraded";
  const tiles = [
    !graded && {
      key: "tcgplayer",
      label: "TCGplayer market",
      where: "US",
      ref: find("tcgplayer", selection.finish, "market"),
    },
    !graded && {
      key: "cardmarket",
      label: "Cardmarket trend",
      where: "EU",
      ref: find("cardmarket", selection.finish === "reverseHolofoil" ? "reverseHolofoil" : "unspecified", "trend"),
    },
    data.sources.some((x) => x.source === "pricecharting") && {
      key: "pricecharting",
      label: `PriceCharting ${pcSub ? subtypeLabel(pcSub) : ""}`.trim(),
      where: "Recent sales",
      ref: pcSub ? find("pricecharting", selection.finish, pcSub) : undefined,
    },
  ].filter(Boolean) as Array<{ key: string; label: string; where: string; ref: PriceReference | undefined }>;

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="quick-prices">
      {tiles.map((t) => (
        <div key={t.key} className="grid content-start gap-2 rounded-2xl border border-line bg-surface p-4 shadow-sm" data-testid={`quick-${t.key}`}>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ink-2">
            {t.label}
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-muted">{t.where}</span>
          </span>
          {t.ref ? (
            <>
              <span className="font-display text-[1.75rem] leading-none font-extrabold tabular-nums">{formatMinor(t.ref.amountMinor, t.ref.currency)}</span>
              <span className="text-xs text-muted">
                {t.ref.stale ? "Possibly out of date · " : ""}Updated {fmtDate(t.ref.observedAt)}
                {t.ref.isDemo ? " · demo" : ""}
              </span>
            </>
          ) : (
            <span className="text-base font-semibold text-muted">No price for this {graded ? "grade" : "finish"}</span>
          )}
        </div>
      ))}
      <p className="text-xs text-muted sm:col-span-3">
        Reference prices in each source&apos;s own currency, not offers. Not condition-specific
        {graded ? "" : "; played cards usually sell for less"}.
      </p>
    </div>
  );
}

export function PriceResults({
  cardId,
  selection,
  assumed = [],
  signedIn,
  offersEnabled,
}: {
  cardId: string;
  selection: Selection;
  assumed?: SelectionField[];
  signedIn: boolean;
  offersEnabled: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [region] = useRegion();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await readJson<PricesResponse>(await fetch(`/api/cards/${encodeURIComponent(cardId)}/prices?finish=${encodeURIComponent(selection.finish)}`));
      setState({ kind: "ok", data });
    } catch (err) {
      if (err instanceof ClientApiError) {
        setState({ kind: "error", status: err.status, message: err.message, retryAfter: err.retryAfterSeconds });
      } else setState({ kind: "error", status: 0, message: "Network error. Check your connection." });
    }
  }, [cardId, selection.finish]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" aria-live="polite" className="grid gap-4">
        <p className="sr-only">Loading price references…</p>
        <div className="h-40 animate-pulse rounded-xl bg-sunken-2" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-sunken-2" />
          <div className="h-48 animate-pulse rounded-xl bg-sunken-2" />
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="grid gap-3 rounded-xl border border-bad-line bg-bad-soft p-4 text-bad">
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
            <button onClick={load} className="rounded-lg bg-bad-solid px-3 py-2 font-medium text-white">
              Retry
            </button>
          )}
          <Link href="/" className="rounded-lg border border-bad px-3 py-2 font-medium">
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
      data.sources.some((x) => x.source === "pricecharting" && x.status === "ok")
        ? `You confirmed a ${selection.grader} ${selection.grade} graded card. TCGplayer and Cardmarket references are for ungraded copies; see PriceCharting for graded sales.`
        : `You confirmed a ${selection.grader} ${selection.grade} graded card. These references are for ungraded (raw) copies and do not reflect graded prices.`,
    );
  else if (selection.condition && selection.condition !== "NM")
    notices.push(
      `You confirmed ${CONDITIONS[selection.condition]} condition. These references are not condition-specific, and played copies typically sell below them.`,
    );
  if (selection.finish === "other")
    notices.push("You weren't sure of the finish, so no finish-specific reference is highlighted.");

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-sm font-medium text-link underline">
        ← New search
      </Link>

      {isDemo && <DemoBanner />}

      <section
        aria-labelledby="card-h"
        className="-mx-4 flex gap-4 border-y border-line bg-surface px-4 py-5 sm:mx-0 sm:gap-6 sm:rounded-3xl sm:border sm:p-6"
        style={{ backgroundImage: "var(--hero-glow)" }}
      >
        <CardArt card={card} size="md" />
        <div className="grid min-w-0 content-start gap-2">
          <h1 id="card-h" className="font-display text-2xl leading-tight font-extrabold sm:text-4xl">
            {card.name}
          </h1>
          <p className="text-ink-2">
            {card.setName} · #{card.number}
            {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
            {card.rarity ? ` · ${card.rarity}` : ""}
          </p>
          <SelectionBar cardId={cardId} finishes={card.finishes} selection={selection} assumed={assumed} />
        </div>
      </section>

      {notices.length > 0 && (
        <ul className="grid gap-2">
          {notices.map((n) => (
            <li key={n} className="rounded-lg border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn">
              {n}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="quick-h" className="grid gap-3">
        <h2 id="quick-h" className="text-xl font-bold">
          Prices for your card
        </h2>
        <QuickPrices data={data} selection={selection} />
      </section>

      <details className="group rounded-xl border border-line bg-surface p-4" data-testid="price-details">
        <summary className="cursor-pointer text-base font-semibold">All price details and sources</summary>
      <section aria-labelledby="refs-h" className="mt-3 grid gap-3">
        <div>
          <h2 id="refs-h" className="text-lg font-semibold">
            Market references
          </h2>
          <p className="text-sm text-ink-2">
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
              highlight={
                s.source !== "pricecharting"
                  ? null
                  : selection.grading === "graded"
                    ? subtypeForGrade(selection.grader, selection.grade)
                    : "ungraded"
              }
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          Retrieved {fmtDate(data.fetchedAt)}
          {data.servedFrom === "stored" ? " from our last stored copy" : ""}. Price data via the Pokémon TCG API
          (pokemontcg.io). Check source terms before relying on these figures.
        </p>
      </section>
      </details>

      <PriceHistory cardId={cardId} finish={selection.finish} />

      {offersEnabled && <OffersSection cardId={cardId} selection={selection} />}

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
