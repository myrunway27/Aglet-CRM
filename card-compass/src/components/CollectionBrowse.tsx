"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatalogCard } from "@/lib/catalog/types";
import { finishLabel } from "@/lib/catalog/types";
import { formatMinor } from "@/lib/money";
import type { SourceId } from "@/lib/prices";
import type { ItemValuation } from "@/lib/valuation";
import { CardArt } from "./CardArt";

export interface BrowseItem {
  id: string;
  catalogId: string;
  setId: string;
  name: string;
  setName: string;
  number: string;
  finish: string;
  language: string;
  grading: string;
  condition: string | null;
  grader: string | null;
  grade: string | null;
  quantity: number;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  setPrintedTotal: number | null;
  valuation: ItemValuation;
}

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of arr) {
    const k = key(t);
    const g = m.get(k);
    if (g) g.push(t);
    else m.set(k, [t]);
  }
  return m;
}

export type View = "list" | "grid" | "binder";
export interface Filters {
  set?: string;
  rarity?: string;
  grading?: "raw" | "graded";
}

export const asCard = (it: BrowseItem): CatalogCard => ({
  catalogId: it.catalogId,
  name: it.name,
  number: it.number,
  setId: it.setId,
  setName: it.setName,
  setSeries: null,
  setPrintedTotal: it.setPrintedTotal,
  setPtcgoCode: null,
  releaseDate: null,
  rarity: it.rarity,
  imageSmall: it.imageSmall,
  imageLarge: it.imageLarge,
  finishes: [],
});

export const itemHref = (it: BrowseItem) =>
  `/cards/${encodeURIComponent(it.catalogId)}?finish=${it.finish}&lang=${it.language}&grading=${it.grading}${it.condition ? `&condition=${it.condition}` : ""}${it.grader ? `&grader=${it.grader}&grade=${it.grade}` : ""}`;

export function applyFilters<T extends BrowseItem>(items: T[], f: Filters): T[] {
  return items.filter(
    (it) => (!f.set || it.setId === f.set) && (!f.rarity || (it.rarity ?? "Unknown") === f.rarity) && (!f.grading || it.grading === f.grading),
  );
}

/** One headline value per item: the first source that prices it (labelled). */
function headline(it: BrowseItem): { minor: number; currency: string; source: SourceId } | null {
  for (const s of ["tcgplayer", "cardmarket", "pricecharting"] as const) {
    const v = it.valuation.bySource[s];
    if (v) return { minor: v.unitMinor * it.quantity, currency: v.currency, source: s };
  }
  return null;
}

const VIEW_KEY = "cc.collectionView";
export function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>("grid");
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore per-device preference after mount
      if (v === "list" || v === "grid" || v === "binder") setView(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [
    view,
    (v: View) => {
      setView(v);
      try {
        localStorage.setItem(VIEW_KEY, v);
      } catch {
        /* ignore */
      }
    },
  ];
}

export function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex rounded-full border border-line bg-surface p-0.5 text-sm font-semibold" role="group" aria-label="View">
      {(["grid", "binder", "list"] as const).map((v) => (
        <button key={v} aria-pressed={view === v} onClick={() => onChange(v)} className={`rounded-full px-3 py-1 capitalize ${view === v ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}>
          {v}
        </button>
      ))}
    </div>
  );
}

function InsightRow({ label, n, total, active, onClick }: { label: string; n: number; total: number; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} aria-pressed={active} className={`grid w-full gap-1 rounded-lg px-2 py-1.5 text-left hover:bg-sunken ${active ? "bg-primary-soft" : ""}`}>
        <span className="flex justify-between gap-2 text-sm">
          <span className="truncate font-medium">{label}</span>
          <span className="font-num text-muted">{n}</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <span className="block h-full rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} />
        </span>
      </button>
    </li>
  );
}

/** Tappable breakdowns (Dex-style insight cards). Tapping a row filters the cards below. */
export function Insights({ items, filters, onFilter }: { items: BrowseItem[]; filters: Filters; onFilter: (f: Filters) => void }) {
  const count = (arr: BrowseItem[]) => arr.reduce((n, i) => n + i.quantity, 0);
  const total = count(items) || 1;
  const bySet = [...groupBy(items, (i) => i.setId)].map(([setId, arr]) => ({ key: setId, label: arr[0].setName, n: count(arr) })).sort((a, b) => b.n - a.n);
  const byRarity = [...groupBy(items, (i) => i.rarity ?? "Unknown")].map(([r, arr]) => ({ key: r, label: r, n: count(arr) })).sort((a, b) => b.n - a.n);
  const raw = count(items.filter((i) => i.grading === "raw"));
  const graded = count(items.filter((i) => i.grading === "graded"));

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="insights">
      <section className="rounded-2xl border border-line bg-surface p-3" aria-label="By set">
        <h3 className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">By set</h3>
        <ul className="grid gap-0.5">
          {bySet.slice(0, 5).map((s) => (
            <InsightRow total={total} key={s.key} label={s.label} n={s.n} active={filters.set === s.key} onClick={() => onFilter({ ...filters, set: filters.set === s.key ? undefined : s.key })} />
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-3" aria-label="By rarity">
        <h3 className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">By rarity</h3>
        <ul className="grid gap-0.5">
          {byRarity.slice(0, 5).map((r) => (
            <InsightRow total={total} key={r.key} label={r.label} n={r.n} active={filters.rarity === r.key} onClick={() => onFilter({ ...filters, rarity: filters.rarity === r.key ? undefined : r.key })} />
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-3" aria-label="Raw or graded">
        <h3 className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">Raw or graded</h3>
        <ul className="grid gap-0.5">
          <InsightRow total={total} label="Raw cards" n={raw} active={filters.grading === "raw"} onClick={() => onFilter({ ...filters, grading: filters.grading === "raw" ? undefined : "raw" })} />
          <InsightRow total={total} label="Graded slabs" n={graded} active={filters.grading === "graded"} onClick={() => onFilter({ ...filters, grading: filters.grading === "graded" ? undefined : "graded" })} />
        </ul>
      </section>
    </div>
  );
}

function Tile({ it }: { it: BrowseItem }) {
  const v = headline(it);
  return (
    <Link href={itemHref(it)} className="card-lift grid content-start gap-1.5 rounded-2xl p-1.5 hover:bg-surface">
      <span className="relative">
        <CardArt card={asCard(it)} size="fill" />
        {it.quantity > 1 && <span className="absolute top-1.5 right-1.5 rounded-full bg-ink px-1.5 text-xs font-bold text-bg">×{it.quantity}</span>}
        {it.grading === "graded" && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-surface/90 px-1.5 text-[11px] font-bold text-ink">
            {it.grader} {it.grade}
          </span>
        )}
      </span>
      <span className="truncate px-0.5 text-sm font-semibold">{it.name}</span>
      <span className="flex items-baseline justify-between gap-1 px-0.5 text-xs text-muted">
        <span className="truncate">{finishLabel(it.finish)}</span>
        {v && <span className="font-num font-semibold text-ink">{formatMinor(v.minor, v.currency)}</span>}
      </span>
    </Link>
  );
}

export function CardGrid({ items }: { items: BrowseItem[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" data-testid="card-grid">
      {items.map((it) => (
        <li key={it.id}>
          <Tile it={it} />
        </li>
      ))}
    </ul>
  );
}

/** Binder view: 3×3 pocket pages, like a real binder. */
export function BinderView({ items }: { items: BrowseItem[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 9));
  const p = Math.min(page, pages - 1);
  const slots = Array.from({ length: 9 }, (_, i) => items[p * 9 + i] ?? null);
  return (
    <div className="grid justify-items-center gap-3" data-testid="binder">
      <div
        className="grid w-full max-w-xl grid-cols-3 gap-2 rounded-3xl border-4 border-ink/80 p-3 shadow-lg sm:gap-3 sm:p-5"
        style={{ background: "linear-gradient(135deg, var(--sunken-2), var(--sunken))" }}
      >
        {slots.map((it, i) =>
          it ? (
            <Link key={it.id} href={itemHref(it)} className="card-lift rounded-lg bg-surface/40 p-1 ring-1 ring-white/30" title={`${it.name} · ${it.setName} #${it.number}`}>
              <CardArt card={asCard(it)} size="fill" />
            </Link>
          ) : (
            <span key={`empty-${i}`} className="aspect-[63/88] rounded-lg border-2 border-dashed border-line-strong/70 bg-surface/20" aria-hidden />
          ),
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button onClick={() => setPage(p - 1)} disabled={p === 0} className="rounded-full border border-line-strong px-3 py-1 font-semibold disabled:opacity-40">
          ← Prev
        </button>
        <span className="font-num text-ink-2">
          Page {p + 1} of {pages}
        </span>
        <button onClick={() => setPage(p + 1)} disabled={p >= pages - 1} className="rounded-full border border-line-strong px-3 py-1 font-semibold disabled:opacity-40">
          Next →
        </button>
      </div>
    </div>
  );
}
