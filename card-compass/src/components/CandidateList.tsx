"use client";

import type { CatalogCard } from "@/lib/catalog/types";
import { finishLabel } from "@/lib/catalog/types";
import type { Candidate } from "@/lib/matching/match";
import { CardArt } from "./CardArt";

const CONFIDENCE_STYLE = {
  high: "bg-emerald-100 text-emerald-900",
  medium: "bg-sky-100 text-sky-900",
  low: "bg-slate-200 text-slate-800",
} as const;

export function CandidateList({
  name,
  legend,
  items,
  selectedId,
  onSelect,
}: {
  name: string;
  legend: string;
  items: Array<{ card: CatalogCard; candidate?: Candidate }>;
  selectedId: string | null;
  onSelect: (card: CatalogCard) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-800">{legend}</legend>
      <ul className="grid gap-2">
        {items.map(({ card, candidate }) => {
          const id = `${name}-${card.catalogId}`;
          const checked = selectedId === card.catalogId;
          return (
            <li key={card.catalogId}>
              <label
                htmlFor={id}
                className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-3 transition ${
                  checked ? "border-brand-700 ring-2 ring-brand-700" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name={name}
                  value={card.catalogId}
                  checked={checked}
                  onChange={() => onSelect(card)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
                />
                <CardArt card={card} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{card.name}</span>
                    {candidate && (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLE[candidate.confidence]}`}>
                        {candidate.confidence} confidence
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-slate-700">
                    {card.setName} · #{card.number}
                    {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
                    {card.rarity ? ` · ${card.rarity}` : ""}
                  </span>
                  <span className="block text-xs text-slate-600">
                    Finishes with prices: {card.finishes.length ? card.finishes.map(finishLabel).join(", ") : "none listed"}
                  </span>
                  {candidate && candidate.reasons.length > 0 && (
                    <span className="mt-1 block text-xs text-slate-600">Why: {candidate.reasons.join("; ")}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
