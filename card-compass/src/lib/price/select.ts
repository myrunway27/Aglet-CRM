import { SOURCE_INFO, type Condition, type Finish, type Grading, type Language, type PriceReference, type SourceId } from "../types";

export interface Selection {
  finish: Finish;
  language: Language;
  grading: Grading;
  condition: Condition;
}

export interface ReferenceRow extends PriceReference {
  stale: boolean;
}

export interface SourceBlock {
  source: SourceId;
  sourceLabel: string;
  currency: string;
  region: string;
  status: "ok" | "none" | "unavailable";
  /** Why there is no quote, shown instead of a number. */
  reason?: string;
  rows: ReferenceRow[];
}

export interface ReferenceView {
  blocks: SourceBlock[];
  notices: string[];
  /** Finishes that DO have references, when the selected one has none. */
  otherFinishes: Finish[];
  demo: boolean;
}

export function isStale(observedAt: string, now: Date, staleAfterDays: number): boolean {
  return now.getTime() - Date.parse(observedAt) > staleAfterDays * 86_400_000;
}

/**
 * Filter reference prices to exactly what the buyer confirmed. Anything that is
 * not comparable becomes "No quote available" with a reason, never a zero.
 */
export function buildReferenceView(
  prices: PriceReference[],
  selection: Selection,
  opts: { now: Date; staleAfterDays: number; unavailable?: Partial<Record<SourceId, string>> },
): ReferenceView {
  const notices: string[] = [];
  let blockReason: string | undefined;

  if (selection.language !== "English") {
    blockReason = `The catalog's price references cover English printings only; no ${selection.language} reference.`;
  } else if (selection.grading === "graded") {
    blockReason = "These sources publish ungraded (raw) card references; no graded reference.";
  }
  if (selection.condition !== "Near Mint" && selection.condition !== "Unsure" && !blockReason) {
    notices.push(
      `References are not condition-specific. A ${selection.condition} copy usually trades below these figures.`,
    );
  }

  const matching = prices.filter((p) => p.finish === selection.finish);
  const otherFinishes = [...new Set(prices.filter((p) => p.finish !== selection.finish).map((p) => p.finish))];

  const blocks: SourceBlock[] = (Object.keys(SOURCE_INFO) as SourceId[]).map((source) => {
    const info = SOURCE_INFO[source];
    const base = { source, sourceLabel: info.label, currency: info.currency, region: info.region };
    const unavailable = opts.unavailable?.[source];
    if (unavailable) return { ...base, status: "unavailable", reason: unavailable, rows: [] };
    if (blockReason) return { ...base, status: "none", reason: blockReason, rows: [] };
    const rows = matching
      .filter((p) => p.source === source)
      .map((p) => ({ ...p, stale: isStale(p.observedAt, opts.now, opts.staleAfterDays) }));
    if (rows.length === 0) {
      const hasOther = prices.some((p) => p.source === source);
      return {
        ...base,
        status: "none",
        reason: hasOther
          ? `${info.label} has references for this card, but not for the selected finish.`
          : `${info.label} did not supply a reference for this card.`,
        rows: [],
      };
    }
    return { ...base, status: "ok", rows };
  });

  if (blocks.some((b) => b.rows.some((r) => r.stale))) {
    notices.push(`Some references are older than ${opts.staleAfterDays} days and may be out of date.`);
  }

  return {
    blocks,
    notices,
    otherFinishes: blockReason ? [] : otherFinishes,
    demo: prices.some((p) => p.demo),
  };
}
