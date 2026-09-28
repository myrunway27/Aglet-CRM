"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ClientApiError, readJson, type ScanResponse } from "@/lib/api-types";
import { finishLabel, type CatalogCard } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { chooseNativePhotos, isNative, takeNativePhoto } from "@/lib/native";
import { CONDITIONS, LANGUAGES } from "@/lib/selection";

type Status = "queued" | "scanning" | "waiting" | "done" | "error";
interface Row {
  id: number;
  file: File;
  thumb: string;
  status: Status;
  message?: string;
  scan?: ScanResponse;
  cardId: string;
  finish: string;
  qty: number;
  preselected: boolean;
}

const MAX_FILES = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scan a stack of cards. Photos are processed one at a time (respecting the
 * scan rate limit). Nothing is added until each card is confirmed; only
 * high-confidence, unambiguous matches are pre-selected, and they're marked.
 */
export function BulkScan() {
  const [rows, setRows] = useState<Row[]>([]);
  const [lang, setLang] = useState("en");
  const [condition, setCondition] = useState("NM");
  const [binders, setBinders] = useState<Array<{ id: string; name: string }>>([]);
  const [binderId, setBinderId] = useState("");
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const nextId = useRef(1);
  const running = useRef(false);
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;

  useEffect(() => {
    api<{ binders: Array<{ id: string; name: string }> }>("/api/binders").then((r) => setBinders(r.binders)).catch(() => undefined);
    return () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.thumb));
  }, []);

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function processQueue() {
    if (running.current) return;
    running.current = true;
    for (;;) {
      const next = rowsRef.current.find((r) => r.status === "queued");
      if (!next) break;
      update(next.id, { status: "scanning", message: undefined });
      const form = new FormData();
      form.set("image", next.file);
      try {
        const res = await fetch("/api/scan", { method: "POST", body: form });
        if (res.status === 429) {
          const wait = Number(res.headers.get("retry-after")) || 30;
          update(next.id, { status: "waiting", message: `Rate limited, retrying in ${wait}s` });
          await sleep(wait * 1000);
          update(next.id, { status: "queued" });
          continue;
        }
        const scan = await readJson<ScanResponse>(res);
        const top = scan.match.candidates[0];
        const confident = Boolean(top && top.confidence === "high" && !scan.match.ambiguous);
        update(next.id, {
          status: "done",
          scan,
          cardId: confident ? top.card.catalogId : "",
          preselected: confident,
          finish: confident && top.card.finishes.length === 1 ? top.card.finishes[0] : "",
        });
      } catch (err) {
        update(next.id, { status: "error", message: err instanceof ClientApiError ? err.message : "Network error." });
      }
      await sleep(250);
    }
    running.current = false;
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const room = MAX_FILES - rowsRef.current.length;
    const add = [...files].slice(0, Math.max(0, room)).map<Row>((file) => ({
      id: nextId.current++,
      file,
      thumb: URL.createObjectURL(file),
      status: "queued",
      cardId: "",
      finish: "",
      qty: 1,
      preselected: false,
    }));
    const merged = [...rowsRef.current, ...add];
    rowsRef.current = merged;
    setRows(merged);
    setResult(null);
    void processQueue();
  }

  const ready = rows.filter((r) => r.status === "done" && r.cardId && r.finish);
  const pending = rows.filter((r) => r.status === "queued" || r.status === "scanning" || r.status === "waiting").length;

  async function addAll() {
    if (!checked) return setResult({ ok: false, text: "Please confirm you've checked each card." });
    try {
      const r = await api<{ added: number }>("/api/collection/bulk", "POST", {
        binderId: binderId || null,
        items: ready.map((row) => ({
          catalogId: row.cardId,
          quantity: row.qty,
          selection: { finish: row.finish, lang, grading: "raw", condition },
        })),
      });
      ready.forEach((row) => URL.revokeObjectURL(row.thumb));
      setRows((rs) => rs.filter((row) => !ready.includes(row)));
      setChecked(false);
      setResult({ ok: true, text: `Added ${r.added} card${r.added === 1 ? "" : "s"} to your collection.` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  const field = "rounded border border-line-strong bg-surface px-2 py-1 text-sm";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Bulk scan</h1>
        <p className="text-ink-2">
          Photograph cards one after another, or pick many photos at once. Review each match, then add them all. For graded
          slabs, use the single-card scan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label
          className="cursor-pointer rounded-xl bg-primary shadow-sm px-4 py-2 font-semibold text-on-primary"
          onClick={(e) => {
            if (!isNative()) return;
            e.preventDefault();
            void takeNativePhoto().then((f) => f && addFiles([f]));
          }}
        >
          Take photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <label
          className="cursor-pointer rounded-lg border border-ink bg-surface px-4 py-2 font-semibold text-link"
          onClick={(e) => {
            if (!isNative()) return;
            e.preventDefault();
            void chooseNativePhotos(MAX_FILES).then((fs) => fs.length && addFiles(fs));
          }}
        >
          Choose photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      <fieldset className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
        <legend className="px-1 font-medium">Applies to every card in this batch</legend>
        <label>
          Language{" "}
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={field}>
            {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>
          Condition{" "}
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={field}>
            {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {binders.length > 0 && (
          <label>
            Binder{" "}
            <select value={binderId} onChange={(e) => setBinderId(e.target.value)} className={field}>
              <option value="">No binder</option>
              {binders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
      </fieldset>

      <p aria-live="polite" className="text-sm text-ink-2">
        {rows.length === 0 ? "No photos yet." : `${rows.length} photo${rows.length === 1 ? "" : "s"} · ${pending} still scanning · ${ready.length} ready to add`}
      </p>

      <ul className="grid gap-2">
        {rows.map((r) => {
          const candidates = r.scan?.match.candidates ?? [];
          const card: CatalogCard | undefined = candidates.find((c) => c.card.catalogId === r.cardId)?.card;
          const finishes = card ? [...new Set([...card.finishes, "normal", "holofoil", "reverseHolofoil"])] : [];
          return (
            <li key={r.id} className="flex gap-3 overflow-hidden rounded-lg border border-line bg-surface p-3" data-testid="bulk-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={r.thumb} alt={`Photo ${r.file.name}`} className="h-24 w-16 shrink-0 rounded object-cover" />
              <div className="grid min-w-0 flex-1 gap-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-muted">{r.file.name}</span>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(r.thumb);
                      setRows((rs) => rs.filter((x) => x.id !== r.id));
                    }}
                    className="text-xs underline"
                  >
                    Remove
                  </button>
                </div>
                {r.status !== "done" ? (
                  <p className={r.status === "error" ? "text-bad" : "text-ink-2"}>
                    {r.status === "error" ? r.message : r.status === "waiting" ? r.message : r.status === "scanning" ? "Scanning…" : "Queued"}
                  </p>
                ) : candidates.length === 0 ? (
                  <p className="text-ink-2">
                    No match. <Link href="/" className="underline">Search manually</Link> for this one.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="grid w-full min-w-0 gap-0.5 sm:w-auto">
                      <span className="text-xs text-muted">Card {r.preselected && "(pre-selected: high confidence, please check)"}</span>
                      <select value={r.cardId} onChange={(e) => update(r.id, { cardId: e.target.value, finish: "", preselected: false })} className={`${field} w-full min-w-0 sm:w-auto sm:max-w-md`}>
                        <option value="">Choose the matching card…</option>
                        {candidates.map((c) => (
                          <option key={c.card.catalogId} value={c.card.catalogId}>
                            {c.card.name} — {c.card.setName} #{c.card.number}{c.card.setPrintedTotal ? `/${c.card.setPrintedTotal}` : ""} ({c.confidence})
                          </option>
                        ))}
                      </select>
                    </label>
                    {card && (
                      <label className="grid gap-0.5">
                        <span className="text-xs text-muted">Finish</span>
                        <select value={r.finish} onChange={(e) => update(r.id, { finish: e.target.value })} className={field}>
                          <option value="">Choose…</option>
                          {finishes.map((f) => <option key={f} value={f}>{finishLabel(f)}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="grid gap-0.5">
                      <span className="text-xs text-muted">Qty</span>
                      <input type="number" min={1} max={999} value={r.qty} onChange={(e) => update(r.id, { qty: Math.max(1, Number(e.target.value) || 1) })} className={`${field} w-16`} />
                    </label>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {ready.length > 0 && (
        <div className="grid gap-2 rounded-xl border border-line bg-surface p-4">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-ink" />
            I checked the set, number and finish of each card against the physical cards.
          </label>
          <button onClick={addAll} className="justify-self-start rounded-xl bg-primary shadow-sm px-4 py-2 font-semibold text-on-primary">
            Add {ready.length} card{ready.length === 1 ? "" : "s"} to collection
          </button>
          {rows.length > ready.length && pending === 0 && (
            <p className="text-xs text-muted">Cards without a chosen match and finish are skipped.</p>
          )}
        </div>
      )}
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-good" : "text-bad"}>
          {result.text} {result.ok && <Link href="/collection" className="underline">View collection</Link>}
        </p>
      )}
    </div>
  );
}
