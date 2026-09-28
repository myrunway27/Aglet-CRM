"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { finishLabel } from "@/lib/catalog/types";
import { CONDITIONS, GRADERS, LANGUAGES, Selection, selectionToQuery, type SelectionField } from "@/lib/selection";

const BASE_FINISHES = ["normal", "holofoil", "reverseHolofoil"];

/**
 * "Your card" settings as tappable chips. Changing one updates the URL, which
 * updates prices and listings. Settings we assumed are flagged so people check them.
 */
export function SelectionBar({
  cardId,
  finishes,
  selection,
  assumed,
}: {
  cardId: string;
  finishes: string[];
  selection: Selection;
  assumed: SelectionField[];
}) {
  const router = useRouter();
  const [grader, setGrader] = useState<string>(selection.grader ?? "PSA");
  const [grade, setGrade] = useState(selection.grade ?? "");

  const go = (patch: Partial<Selection>) => {
    const next = { ...selection, ...patch };
    if (next.grading === "raw") {
      next.grader = undefined;
      next.grade = undefined;
      next.condition ??= "NM";
    } else next.condition = undefined;
    const parsed = Selection.safeParse(next);
    if (parsed.success) router.replace(`/cards/${encodeURIComponent(cardId)}?${selectionToQuery(parsed.data)}`, { scroll: false });
  };

  const options = [...new Set([...finishes, ...BASE_FINISHES, selection.finish]), "other"].filter((f, i, a) => a.indexOf(f) === i);
  const chip = (field: SelectionField | null) =>
    `relative inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium bg-white ${
      field && assumed.includes(field) ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-300"
    }`;
  const flag = (field: SelectionField) =>
    assumed.includes(field) ? <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">check</span> : null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Your card">
        <label className={chip("finish")}>
          <select
            value={selection.finish}
            onChange={(e) => go({ finish: e.target.value })}
            className="appearance-none bg-transparent pr-1 outline-none [field-sizing:content]"
            aria-label="Finish"
          >
            {options.map((f) => (
              <option key={f} value={f}>
                {finishLabel(f)}
              </option>
            ))}
          </select>
          {flag("finish")}
        </label>

        <label className={chip(null)}>
          <select
            value={selection.grading}
            onChange={(e) => go({ grading: e.target.value as "raw" | "graded", ...(e.target.value === "graded" ? { grader: grader as Selection["grader"], grade: grade || "10" } : {}) })}
            className="appearance-none bg-transparent pr-1 outline-none [field-sizing:content]"
            aria-label="Raw or graded"
          >
            <option value="raw">Raw card</option>
            <option value="graded">Graded slab</option>
          </select>
        </label>

        {selection.grading === "raw" ? (
          <label className={chip("condition")}>
            <select
              value={selection.condition}
              onChange={(e) => go({ condition: e.target.value as Selection["condition"] })}
              className="appearance-none bg-transparent pr-1 outline-none [field-sizing:content]"
              aria-label="Condition"
            >
              {Object.entries(CONDITIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {flag("condition")}
          </label>
        ) : (
          <span className={`${chip(null)} flex items-center gap-1`}>
            <select
              value={grader}
              onChange={(e) => {
                setGrader(e.target.value);
                go({ grader: e.target.value as Selection["grader"] });
              }}
              className="appearance-none bg-transparent outline-none [field-sizing:content]"
              aria-label="Grader"
            >
              {GRADERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value.trim())}
              onBlur={() => grade && grade !== selection.grade && go({ grade })}
              onKeyDown={(e) => e.key === "Enter" && grade && go({ grade })}
              inputMode="decimal"
              aria-label="Grade"
              className="w-10 bg-transparent text-center outline-none"
              placeholder="10"
            />
          </span>
        )}

        <label className={chip("lang")}>
          <select
            value={selection.lang}
            onChange={(e) => go({ lang: e.target.value as Selection["lang"] })}
            className="appearance-none bg-transparent pr-1 outline-none [field-sizing:content]"
            aria-label="Language"
          >
            {Object.entries(LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {flag("lang")}
        </label>
      </div>
      {assumed.length > 0 && (
        <p className="text-sm text-slate-700">
          We assumed the settings marked <span className="font-semibold text-amber-800">check</span>. Tap one to change it if your card is different.
        </p>
      )}
    </div>
  );
}
