"use client";

import { useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";
import { finishLabel } from "@/lib/catalog/types";

interface DryRun {
  dryRun: true;
  valid: number;
  errors: Array<{ line: number; message: string }>;
  preview: Array<{ line: number; name: string; setName: string; number: string; finish: string; quantity: number; binder: string | null }>;
}

/** CSV import with a mandatory preview step: nothing is written until the user confirms. */
export function ImportPanel({ onDone }: { onDone: () => void }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<DryRun | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(text: string) {
    setBusy(true);
    setMsg(null);
    try {
      setPreview(await api<DryRun>("/api/collection/import", "POST", { csv: text, dryRun: true }));
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
    setBusy(false);
  }

  async function commit() {
    if (!csv) return;
    setBusy(true);
    try {
      const r = await api<{ added: number }>("/api/collection/import", "POST", { csv, dryRun: false });
      setMsg({ ok: true, text: `Imported ${r.added} card${r.added === 1 ? "" : "s"}.` });
      setPreview(null);
      setCsv(null);
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Import from CSV</h3>
      <p className="text-sm text-slate-700">
        Use the same columns as the export. Required: <code>catalog_id</code> and <code>finish</code>; optional: language,
        grading, condition, grader, grade, quantity, purchase_price, purchase_currency, binder. You&apos;ll see a preview first.
      </p>
      <label className="text-sm font-medium">
        CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 2_000_000) return setMsg({ ok: false, text: "File is too large (max 2 MB)." });
            const text = await f.text();
            setFileName(f.name);
            setCsv(text);
            void check(text);
          }}
        />
      </label>
      {busy && <p aria-live="polite" className="text-sm">Checking…</p>}
      {preview && (
        <div className="grid gap-2 text-sm" aria-live="polite">
          <p>
            <strong>{preview.valid}</strong> row{preview.valid === 1 ? "" : "s"} ready to import from {fileName}
            {preview.errors.length > 0 && `, ${preview.errors.length} problem${preview.errors.length === 1 ? "" : "s"}`}.
          </p>
          {preview.errors.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded bg-amber-50 p-2 text-amber-900">
              {preview.errors.map((e, i) => (
                <li key={i}>Line {e.line}: {e.message}</li>
              ))}
            </ul>
          )}
          {preview.preview.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded bg-slate-50 p-2">
              {preview.preview.map((p) => (
                <li key={p.line}>
                  {p.quantity}× {p.name} — {p.setName} #{p.number} · {finishLabel(p.finish)}
                  {p.binder ? ` · ${p.binder}` : ""}
                </li>
              ))}
            </ul>
          )}
          <button
            disabled={busy || preview.valid === 0}
            onClick={commit}
            className="justify-self-start rounded-md bg-brand-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            Import {preview.valid} row{preview.valid === 1 ? "" : "s"}
          </button>
        </div>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
