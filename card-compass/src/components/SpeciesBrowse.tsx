"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import type { CatalogCard } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { CardArt } from "./CardArt";
import { ProgressRing } from "./ProgressRing";

export function SpeciesIndex({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [species, setSpecies] = useState<Array<{ species: string; distinct: number; quantity: number }> | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    api<{ species: Array<{ species: string; distinct: number; quantity: number }> }>("/api/species")
      .then((r) => setSpecies(r.species))
      .catch(() => setSpecies([]));
  }, [signedIn]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-3xl font-extrabold">Browse by Pokémon</h1>
        <p className="text-ink-2">Every card of one Pokémon in one place, across all sets and forms (ex, V, VMAX…).</p>
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) router.push(`/pokemon/${encodeURIComponent(q.trim())}`);
        }}
        className="flex max-w-lg gap-2"
      >
        <label htmlFor="species" className="sr-only">Pokémon name</label>
        <input
          id="species"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pikachu, Charizard, Mew…"
          className="min-w-0 flex-1 rounded-xl border-2 border-line-strong bg-surface px-3 py-2 text-base focus-visible:border-ink focus-visible:outline-none"
        />
        <button className="rounded-xl bg-primary px-4 py-2 font-bold text-on-primary shadow-sm hover:bg-primary-hover">Open</button>
      </form>
      {signedIn ? (
        <section className="grid gap-3" aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">In your collection</h2>
          {species === null ? (
            <p aria-busy="true">Loading…</p>
          ) : species.length === 0 ? (
            <p className="text-ink-2">No Pokémon yet. Add cards to your collection and they&apos;ll show up here.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {species.map((s) => (
                <li key={s.species}>
                  <Link href={`/pokemon/${encodeURIComponent(s.species)}`} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-semibold hover:border-ink">
                    {s.species}
                    <span className="rounded-full bg-sunken px-1.5 text-xs font-bold text-muted">{s.distinct}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="text-ink-2">
          <Link href="/login?next=/pokemon" className="font-semibold text-link underline">Sign in</Link> to see which Pokémon you already own.
        </p>
      )}
    </div>
  );
}

interface SpeciesData {
  species: string;
  cards: Array<{ card: CatalogCard; ownedCount: number }>;
  signedIn: boolean;
}

export function SpeciesDetail({ name }: { name: string }) {
  const [data, setData] = useState<SpeciesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "owned" | "missing">("all");
  useEffect(() => {
    api<SpeciesData>(`/api/species?name=${encodeURIComponent(name)}`)
      .then(setData)
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Network error."));
  }, [name]);

  if (error) return <p role="alert" className="text-bad">{error}</p>;
  if (!data) return <div aria-busy="true" className="h-64 animate-pulse rounded-3xl bg-sunken" />;
  const owned = data.cards.filter((c) => c.ownedCount > 0).length;
  const rows = data.cards.filter((c) => (filter === "all" ? true : filter === "owned" ? c.ownedCount > 0 : c.ownedCount === 0));

  return (
    <div className="grid gap-5">
      <Link href="/pokemon" className="text-sm font-semibold text-link underline">← All Pokémon</Link>
      <div className="flex items-center gap-4">
        {data.signedIn && <ProgressRing owned={owned} total={data.cards.length} size={72} />}
        <div>
          <h1 className="text-3xl font-extrabold">{data.species}</h1>
          <p className="text-ink-2">
            {data.cards.length} card{data.cards.length === 1 ? "" : "s"}
            {data.signedIn ? ` · you own ${owned}` : ""}
          </p>
        </div>
      </div>
      {data.signedIn && (
        <div className="flex gap-2" role="group" aria-label="Filter cards">
          {(["all", "owned", "missing"] as const).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${filter === f ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface"}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}
      {data.cards.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4">No cards found for &quot;{name}&quot;. Check the spelling.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="species-grid">
          {rows.map(({ card, ownedCount }) => (
            <li key={card.catalogId}>
              <Link href={`/cards/${encodeURIComponent(card.catalogId)}`} className="card-lift grid gap-1 rounded-2xl p-1.5 hover:bg-surface">
                <span className={`relative ${data.signedIn && !ownedCount ? "opacity-45 grayscale" : ""}`}>
                  <CardArt card={card} size="fill" />
                  {ownedCount > 0 && <span className="absolute top-1.5 right-1.5 rounded-full bg-good px-1.5 text-xs font-bold text-bg">✓{ownedCount > 1 ? ` ×${ownedCount}` : ""}</span>}
                </span>
                <span className="truncate px-0.5 text-sm font-semibold">{card.name}</span>
                <span className="truncate px-0.5 text-xs text-muted">
                  {card.setName} · #{card.number}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
