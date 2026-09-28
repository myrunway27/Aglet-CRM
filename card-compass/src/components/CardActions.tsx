"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";
import { CURRENCIES, formatMinor, minorExponent } from "@/lib/money";
import { SOURCES, subtypeLabel, type PriceReference, type SourceId } from "@/lib/prices";
import type { Selection } from "@/lib/selection";

const ALERT_SUBTYPES: Record<SourceId, string[]> = {
  tcgplayer: ["market", "low", "mid"],
  cardmarket: ["trend", "averageSell", "low", "avg7", "avg30"],
  pricecharting: [],
};

export function CardActions({
  cardId,
  selection,
  references,
  signedIn,
  returnTo,
}: {
  cardId: string;
  selection: Selection;
  references: PriceReference[];
  signedIn: boolean;
  returnTo: string;
}) {
  const [qty, setQty] = useState(1);
  const [paid, setPaid] = useState("");
  const [paidCur, setPaidCur] = useState("USD");
  const [colMsg, setColMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [binders, setBinders] = useState<Array<{ id: string; name: string }>>([]);
  const [binderId, setBinderId] = useState("");
  const [wishTarget, setWishTarget] = useState("");
  const [wishSource, setWishSource] = useState<SourceId>("tcgplayer");
  const [wishMsg, setWishMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (signedIn) api<{ binders: Array<{ id: string; name: string }> }>("/api/binders").then((r) => setBinders(r.binders)).catch(() => undefined);
  }, [signedIn]);

  const cmFinish = selection.finish === "reverseHolofoil" ? "reverseHolofoil" : "unspecified";
  const refFor = (s: SourceId, sub: string) =>
    references.find((r) => r.source === s && r.subtype === sub && r.finish === (s === "cardmarket" ? cmFinish : selection.finish));
  const sources = (Object.keys(ALERT_SUBTYPES) as SourceId[]).filter((s) => ALERT_SUBTYPES[s].some((sub) => refFor(s, sub)));
  const [source, setSource] = useState<SourceId>(sources[0] ?? "tcgplayer");
  const subtypes = ALERT_SUBTYPES[source].filter((sub) => refFor(source, sub));
  const [subtype, setSubtype] = useState(subtypes[0] ?? ALERT_SUBTYPES[source][0]);
  const [direction, setDirection] = useState<"above" | "below">("below");
  const [threshold, setThreshold] = useState("");
  const [alertMsg, setAlertMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const current = refFor(source, subtype);

  if (!signedIn) {
    return (
      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="font-medium text-link underline">
          Sign in
        </Link>{" "}
        to add this card to your collection or get a price alert.
      </section>
    );
  }

  async function addToCollection(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/collection", "POST", {
        catalogId: cardId,
        selection,
        quantity: qty,
        binderId: binderId || null,
        ...(paid ? { purchasePrice: paid, purchaseCurrency: paidCur } : {}),
      });
      setColMsg({ ok: true, text: "Added to your collection." });
    } catch (err) {
      setColMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  async function createAlert(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/alerts", "POST", { catalogId: cardId, finish: selection.finish, source, subtype, direction, threshold });
      setAlertMsg({ ok: true, text: "Alert created. Manage it under Alerts." });
    } catch (err) {
      setAlertMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  async function addToWishlist(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/wishlist", "POST", {
        catalogId: cardId,
        finish: selection.finish,
        ...(wishTarget ? { target: { price: wishTarget, source: wishSource } } : {}),
      });
      setWishMsg({ ok: true, text: wishTarget ? "On your wishlist, with a price alert." : "Added to your wishlist." });
    } catch (err) {
      setWishMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  const field = "mt-1 block w-full rounded-lg border border-line-strong bg-surface px-2 py-2 text-base";
  const msg = (m: { ok: boolean; text: string } | null) =>
    m && (
      <p role={m.ok ? "status" : "alert"} className={`text-sm ${m.ok ? "text-good" : "text-bad"}`}>
        {m.text}
      </p>
    );

  return (
    <section aria-labelledby="track-h" className="grid gap-3">
      <h2 id="track-h" className="text-xl font-semibold">Track this card</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <form onSubmit={addToCollection} aria-label="Add to collection" className="grid content-start gap-3 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Add to collection</h3>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm font-medium">
              Quantity
              <input type="number" min={1} max={999} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={field} />
            </label>
            <label className="text-sm font-medium">
              Paid each <span className="font-normal text-muted">(optional)</span>
              <input inputMode="decimal" placeholder="0.00" value={paid} onChange={(e) => setPaid(e.target.value.trim())} className={field} />
            </label>
            <label className="text-sm font-medium">
              Currency
              <select value={paidCur} onChange={(e) => setPaidCur(e.target.value)} className={field}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {binders.length > 0 && (
            <label className="text-sm font-medium">
              Binder
              <select value={binderId} onChange={(e) => setBinderId(e.target.value)} className={field}>
                <option value="">No binder</option>
                {binders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          <button className="rounded-xl bg-primary shadow-sm px-3 py-2 font-semibold text-on-primary">Add to collection</button>
          {msg(colMsg)}
        </form>

        <form onSubmit={addToWishlist} aria-label="Add to wishlist" className="grid content-start gap-3 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Want it?</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">
              Target price <span className="font-normal text-muted">(optional)</span>
              <input inputMode="decimal" placeholder="0.00" value={wishTarget} onChange={(e) => setWishTarget(e.target.value.trim())} className={field} />
            </label>
            <label className="text-sm font-medium">
              Watch
              <select value={wishSource} onChange={(e) => setWishSource(e.target.value as SourceId)} className={field}>
                <option value="tcgplayer">TCGplayer market (USD)</option>
                <option value="cardmarket">Cardmarket trend (EUR)</option>
              </select>
            </label>
          </div>
          <button className="rounded-lg border border-ink px-3 py-2 font-semibold text-link">Add to wishlist</button>
          {msg(wishMsg)}
        </form>

        <form onSubmit={createAlert} aria-label="Create price alert" className="grid content-start gap-3 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Price alert</h3>
          {sources.length === 0 ? (
            <p className="text-sm text-ink-2">No reference price exists for this finish, so there is nothing to watch.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm font-medium">
                  Source
                  <select
                    value={source}
                    onChange={(e) => {
                      const s = e.target.value as SourceId;
                      setSource(s);
                      setSubtype(ALERT_SUBTYPES[s].find((sub) => refFor(s, sub)) ?? ALERT_SUBTYPES[s][0]);
                    }}
                    className={field}
                  >
                    {sources.map((s) => <option key={s} value={s}>{SOURCES[s].label} ({SOURCES[s].currency})</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Price type
                  <select value={subtype} onChange={(e) => setSubtype(e.target.value)} className={field}>
                    {subtypes.map((s) => <option key={s} value={s}>{subtypeLabel(s)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  When it goes
                  <select value={direction} onChange={(e) => setDirection(e.target.value as "above" | "below")} className={field}>
                    <option value="below">Below</option>
                    <option value="above">Above</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Price ({SOURCES[source].currency})
                  <input
                    inputMode="decimal"
                    required
                    placeholder={current ? (current.amountMinor / 10 ** minorExponent(current.currency)).toFixed(2) : "0.00"}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value.trim())}
                    className={field}
                  />
                </label>
              </div>
              {current && <p className="text-xs text-muted">Currently {formatMinor(current.amountMinor, current.currency)} (as of {current.observedAt.slice(0, 10)}).</p>}
              <button className="rounded-xl bg-primary shadow-sm px-3 py-2 font-semibold text-on-primary">Create alert</button>
            </>
          )}
          {msg(alertMsg)}
        </form>
      </div>
    </section>
  );
}
