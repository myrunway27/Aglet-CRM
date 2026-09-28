import { z } from "zod";
import { CATALOG_ID_RE } from "./catalog/types";
import { COLLECTION_COLUMNS, parseCsv } from "./csv";
import { CURRENCIES, parseMinor } from "./money";
import { Selection } from "./selection";

export const MAX_IMPORT_ROWS = 1000;

export interface ImportRow {
  line: number;
  catalogId: string;
  selection: Selection;
  quantity: number;
  purchasePriceMinor: number | null;
  purchaseCurrency: string | null;
  binder: string | null;
}

export interface ImportError {
  line: number;
  message: string;
}

const Row = z.object({
  catalog_id: z.string().regex(CATALOG_ID_RE, "catalog_id is missing or invalid"),
  finish: z.string().regex(/^[A-Za-z0-9]{1,32}$/, "finish is missing or invalid"),
  language: z.string().default("en"),
  grading: z.string().default("raw"),
  condition: z.string().optional(),
  grader: z.string().optional(),
  grade: z.string().optional(),
  quantity: z.string().default("1"),
  purchase_price: z.string().optional(),
  purchase_currency: z.string().optional(),
  binder: z.string().max(60, "binder name is too long").optional(),
});

/**
 * Parse and validate a collection CSV (same columns as the export; only
 * catalog_id and finish are required). Every problem is reported by line
 * number; nothing is guessed.
 */
export function parseCollectionCsv(text: string): { rows: ImportRow[]; errors: ImportError[] } {
  const table = parseCsv(text);
  const errors: ImportError[] = [];
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: "The file is empty." }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  for (const required of ["catalog_id", "finish"]) {
    if (!header.includes(required)) errors.push({ line: 1, message: `Missing required column "${required}".` });
  }
  if (errors.length) return { rows: [], errors };
  const unknown = header.filter((h) => h && !(COLLECTION_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push({ line: 1, message: `Ignoring unknown columns: ${unknown.join(", ")}` });
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ line: 1, message: `Too many rows (max ${MAX_IMPORT_ROWS}).` }] };
  }

  const rows: ImportRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const obj: Record<string, string> = {};
    header.forEach((h, j) => {
      const v = (cells[j] ?? "").trim().replace(/^'(?=[=+\-@])/, ""); // undo export's formula guard
      if (v !== "") obj[h] = v;
    });
    const r = Row.safeParse(obj);
    if (!r.success) return errors.push({ line, message: r.error.issues[0]?.message ?? "Invalid row" });
    const d = r.data;
    const grading = d.grading.toLowerCase();
    const sel = Selection.safeParse({
      finish: d.finish,
      lang: d.language.toLowerCase(),
      grading,
      condition: grading === "raw" ? (d.condition ?? "NM").toUpperCase() : undefined,
      grader: grading === "graded" ? d.grader : undefined,
      grade: grading === "graded" ? d.grade : undefined,
    });
    if (!sel.success) return errors.push({ line, message: "Check language, grading, condition, grader and grade." });
    const quantity = Number(d.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return errors.push({ line, message: "quantity must be 1–999" });
    let purchasePriceMinor: number | null = null;
    let purchaseCurrency: string | null = null;
    if (d.purchase_price || d.purchase_currency) {
      const cur = (d.purchase_currency ?? "").toUpperCase();
      if (!(CURRENCIES as readonly string[]).includes(cur)) return errors.push({ line, message: `purchase_currency must be one of ${CURRENCIES.join(", ")}` });
      if (!/^\d{1,7}(\.\d{1,2})?$/.test(d.purchase_price ?? "")) return errors.push({ line, message: "purchase_price must look like 12.50" });
      purchasePriceMinor = parseMinor(d.purchase_price!, cur);
      purchaseCurrency = cur;
    }
    rows.push({ line, catalogId: d.catalog_id, selection: sel.data, quantity, purchasePriceMinor, purchaseCurrency, binder: d.binder ?? null });
  });
  return { rows, errors };
}
