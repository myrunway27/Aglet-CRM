"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel, type CatalogCard } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import type { Candidate } from "@/lib/matching/match";
import type { PsaCert } from "@/lib/psa/cert";
import { CandidateList } from "./CandidateList";

interface Lookup {
  cert: PsaCert;
  alreadyOwned: boolean;
  finishHint: string | null;
  parsedName: string;
  candidates: Candidate[];
}

export function GradedLookup() {
  const [certInput, setCertInput] = useState("");
  const [data, setData] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<CatalogCard | null>(null);
  const [finish, setFinish] = useState("");
  const [paid, setPaid] = useState("");
  const [done, setDone] = useState<{ ok: boolean; text: string } | null>(null);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    setCard(null);
    setDone(null);
    try {
      const d = await api<Lookup>("/api/graded/lookup", "POST", { cert: certInput.replace(/\D/g, "") });
      setData(d);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
    setBusy(false);
  }

  async function add() {
    if (!data || !card || !finish || !data.cert.grade) return;
    try {
      await api("/api/collection", "POST", {
        catalogId: card.catalogId,
        quantity: 1,
        certNumber: data.cert.certNumber,
        selection: { finish, lang: "en", grading: "graded", grader: "PSA", grade: data.cert.grade },
        ...(paid ? { purchasePrice: paid, purchaseCurrency: "USD" } : {}),
      });
      setDone({ ok: true, text: `Added PSA ${data.cert.grade} ${card.name} (cert ${data.cert.certNumber}).` });
    } catch (err) {
      setDone({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  const finishes = card ? [...new Set([...card.finishes, "normal", "holofoil", "reverseHolofoil"])] : [];
  const field = "mt-1 block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Add a graded card</h1>
        <p className="text-ink-2">
          Enter the cert number from a PSA slab. We look up PSA&apos;s record, suggest the matching printing, and you confirm it.
        </p>
      </div>
      <form onSubmit={lookup} className="flex max-w-md gap-2" role="search">
        <label htmlFor="cert" className="sr-only">PSA cert number</label>
        <input
          id="cert"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PSA cert number"
          value={certInput}
          onChange={(e) => setCertInput(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line-strong px-3 py-2 text-base"
        />
        <button disabled={busy} className="rounded-xl bg-primary shadow-sm px-4 py-2 font-semibold text-on-primary disabled:opacity-60">
          {busy ? "Looking up…" : "Look up"}
        </button>
      </form>
      {error && <p role="alert" className="text-bad">{error}</p>}

      {data && (
        <section aria-labelledby="cert-h" className="grid gap-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 id="cert-h" className="font-semibold">
              PSA cert {data.cert.certNumber}
              {data.cert.isDemo && <span className="ml-2 rounded bg-warn-soft px-1.5 py-0.5 text-xs text-warn">Demo record</span>}
            </h2>
            <p className="text-ink">
              {[data.cert.year, data.cert.brand, data.cert.cardNumber ? `#${data.cert.cardNumber}` : null, data.cert.subject, data.cert.variety].filter(Boolean).join(" · ")}
            </p>
            <p className="text-lg font-semibold">{data.cert.gradeLabel ?? "No grade"}</p>
            {data.cert.population !== null && (
              <p className="text-sm text-ink-2">
                PSA population: {data.cert.population} at this grade, {data.cert.populationHigher ?? 0} higher
              </p>
            )}
            {data.alreadyOwned && <p className="mt-1 text-sm font-medium text-warn">This cert is already in your collection.</p>}
          </div>

          {!data.cert.grade ? (
            <p className="rounded-lg bg-sunken p-3 text-sm">
              This slab has no numeric grade ({data.cert.gradeLabel}), so it can&apos;t be valued by grade. Add it from the card&apos;s page instead.
            </p>
          ) : data.candidates.length === 0 ? (
            <p className="rounded-lg bg-sunken p-3 text-sm">
              No catalog match for &quot;{data.parsedName}&quot;. <Link href="/" className="underline">Search manually</Link>.
            </p>
          ) : (
            <CandidateList
              name="graded-candidate"
              legend="Which printing is in the slab? (nothing is selected until you choose)"
              items={data.candidates.map((c) => ({ card: c.card, candidate: c }))}
              selectedId={card?.catalogId ?? null}
              onSelect={(c) => {
                setCard(c);
                setFinish(data.finishHint && [...c.finishes, "normal", "holofoil", "reverseHolofoil"].includes(data.finishHint) ? data.finishHint : "");
              }}
            />
          )}

          {card && data.cert.grade && (
            <div className="grid max-w-lg gap-3 rounded-xl border border-line bg-surface p-4">
              <label className="text-sm font-medium">
                Finish {data.finishHint && finish === data.finishHint && <span className="font-normal text-muted">(suggested by the PSA label, please check)</span>}
                <select value={finish} onChange={(e) => setFinish(e.target.value)} className={field}>
                  <option value="">Choose…</option>
                  {finishes.map((f) => <option key={f} value={f}>{finishLabel(f)}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Paid (USD, optional)
                <input inputMode="decimal" placeholder="0.00" value={paid} onChange={(e) => setPaid(e.target.value.trim())} className={field} />
              </label>
              <button
                disabled={!finish || data.alreadyOwned}
                onClick={add}
                className="justify-self-start rounded-xl bg-primary shadow-sm px-4 py-2 font-semibold text-on-primary disabled:opacity-50"
              >
                Add PSA {data.cert.grade} to collection
              </button>
              {done && (
                <p role={done.ok ? "status" : "alert"} className={done.ok ? "text-good" : "text-bad"}>
                  {done.text} {done.ok && <Link href="/collection" className="underline">View collection</Link>}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
