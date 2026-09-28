"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { CatalogCard } from "@/lib/catalog/types";
import { finishLabel } from "@/lib/catalog/types";
import { CONDITIONS, GRADERS, LANGUAGES, Selection, selectionToQuery } from "@/lib/selection";
import { CardArt } from "./CardArt";

const BASE_FINISHES = ["normal", "holofoil", "reverseHolofoil"];

export function ConfirmForm({ card, scanId }: { card: CatalogCard; scanId: string | null }) {
  const router = useRouter();
  const uid = useId();
  const finishes = [...new Set([...card.finishes, ...BASE_FINISHES]), "other"];
  const [finish, setFinish] = useState("");
  const [lang, setLang] = useState("en");
  const [grading, setGrading] = useState<"raw" | "graded">("raw");
  const [condition, setCondition] = useState("");
  const [grader, setGrader] = useState("");
  const [grade, setGrade] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!checked) return setError("Please confirm the set and collector number match your card.");
    const parsed = Selection.safeParse({
      finish,
      lang,
      grading,
      condition: grading === "raw" ? condition || undefined : undefined,
      grader: grading === "graded" ? grader || undefined : undefined,
      grade: grading === "graded" ? grade || undefined : undefined,
    });
    if (!parsed.success) {
      return setError(
        !finish ? "Choose the finish of your card." : (parsed.error.issues[0]?.message ?? "Please complete the form."),
      );
    }
    setError(null);
    setSubmitting(true);
    if (scanId) {
      // Best-effort record of which card the buyer confirmed; never blocks navigation.
      await fetch(`/api/scans/${encodeURIComponent(scanId)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: card.catalogId }),
      }).catch(() => undefined);
    }
    router.push(`/cards/${encodeURIComponent(card.catalogId)}?${selectionToQuery(parsed.data)}`);
  }

  const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base";

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${uid}-title`}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      noValidate
    >
      <div className="flex gap-4">
        <CardArt card={card} />
        <div>
          <h2 id={`${uid}-title`} className="text-lg font-semibold">
            Confirm your exact card
          </h2>
          <p className="text-sm text-slate-700">
            {card.name} — {card.setName} #{card.number}
            {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Scans can&apos;t reliably tell finish, language or condition. Check your card and tell us.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Finish</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {finishes.map((f) => (
            <label
              key={f}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                finish === f ? "border-brand-700 bg-brand-50" : "border-slate-300"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-finish`}
                value={f}
                checked={finish === f}
                onChange={() => setFinish(f)}
                className="accent-brand-700"
              />
              {finishLabel(f)}
              {card.finishes.includes(f) && <span className="text-xs text-slate-600">(priced)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Language
          <select className={field} value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Raw or graded</legend>
          <div className="mt-1 flex gap-2">
            {(["raw", "graded"] as const).map((g) => (
              <label
                key={g}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  grading === g ? "border-brand-700 bg-brand-50" : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`${uid}-grading`}
                  checked={grading === g}
                  onChange={() => setGrading(g)}
                  className="accent-brand-700"
                />
                {g === "raw" ? "Raw (ungraded)" : "Graded slab"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {grading === "raw" ? (
        <label className="text-sm font-medium">
          Condition
          <select className={field} value={condition} onChange={(e) => setCondition(e.target.value)} required>
            <option value="">Choose condition…</option>
            {Object.entries(CONDITIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v} ({k})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Grader
            <select className={field} value={grader} onChange={(e) => setGrader(e.target.value)} required>
              <option value="">Choose grader…</option>
              {GRADERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Grade
            <input
              className={field}
              inputMode="decimal"
              placeholder="e.g. 9 or 9.5"
              value={grade}
              onChange={(e) => setGrade(e.target.value.trim())}
              required
            />
          </label>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand-700"
        />
        I checked the set symbol and collector number on my card, and they match this printing.
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {submitting ? "Opening references…" : "Confirm and see price references"}
      </button>
    </form>
  );
}
