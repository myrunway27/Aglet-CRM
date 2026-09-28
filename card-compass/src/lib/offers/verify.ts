import type { CatalogCard } from "../catalog/types";
import { normalizeName } from "../matching/normalize";
import type { Selection } from "../selection";
import type { Listing } from "./types";

export type CheckResult = "ok" | "mismatch" | "unknown";

export interface Verification {
  verdict: "match" | "mismatch" | "unverified";
  checks: Record<"print" | "finish" | "language" | "grading" | "condition" | "seller" | "listingType", CheckResult>;
  reasons: string[];
}

const CONDITION_ORDER = ["NM", "LP", "MP", "HP", "DMG"] as const;
type Cond = (typeof CONDITION_ORDER)[number];

const LANGUAGE_WORDS: Record<string, RegExp> = {
  ja: /\b(japanese|japan|jpn|jp)\b/,
  ko: /\b(korean|kor)\b/,
  zh: /\b(chinese|s-chinese|t-chinese)\b/,
  de: /\b(german|deutsch)\b/,
  fr: /\b(french|francais|français|fr)\b/,
  it: /\b(italian|italiano)\b/,
  es: /\b(spanish|espanol|español)\b/,
  pt: /\b(portuguese|portugues)\b/,
};

// Names that denote a different card when appended (e.g. "Charizard ex" is not "Charizard").
const MECHANIC_SUFFIX = /^(ex|gx|v|vmax|vstar|break|lv\.?x|prime|star|δ|delta)\b/;
const NOT_A_SINGLE = /\b(lot|bundle|proxy|custom|orica|fan ?art|replica|jumbo|oversized|digital|code card|sleeve|binder|empty)\b|\bx\s?\d+\b|\b\d+\s?x\b/;
const GRADED = /\b(psa|bgs|beckett|cgc|sgc|ace|tag|graded|slab)\b/;

/** Map a free-text condition to our scale, or null if unrecognized. */
export function parseCondition(text: string): Cond | null {
  const t = text.toLowerCase();
  if (/near mint|\bnm\b|mint or better/.test(t)) return "NM";
  if (/lightly played|\blp\b|excellent/.test(t)) return "LP";
  if (/moderately played|\bmp\b|very good/.test(t)) return "MP";
  if (/heavily played|\bpoor\b/.test(t)) return "HP"; // not "hp": titles use it for hit points
  if (/damaged|\bdmg\b/.test(t)) return "DMG";
  return null;
}

export interface SellerPolicy {
  minFeedbackPct: number;
  minFeedbackScore: number;
}

/**
 * Check that a listing is the same print, finish, language, grading and
 * condition the buyer confirmed. Listing titles are free text, so anything we
 * cannot confirm is "unknown" and the listing is not ranked.
 */
export function verifyListing(
  listing: Listing,
  card: CatalogCard,
  sel: Selection,
  policy: SellerPolicy,
): Verification {
  const title = ` ${normalizeName(listing.title)} `;
  const rawTitle = listing.title.toLowerCase();
  const reasons: string[] = [];
  const checks: Verification["checks"] = {
    print: "ok",
    finish: "ok",
    language: "ok",
    grading: "ok",
    condition: "ok",
    seller: "ok",
    listingType: "ok",
  };
  const fail = (k: keyof Verification["checks"], r: string) => {
    checks[k] = "mismatch";
    reasons.push(r);
  };
  const unsure = (k: keyof Verification["checks"], r: string) => {
    if (checks[k] === "ok") checks[k] = "unknown";
    reasons.push(r);
  };

  // Listing type
  if (NOT_A_SINGLE.test(rawTitle)) fail("listingType", "Looks like a lot, proxy or non-single listing");

  // Print: name + collector number
  const name = normalizeName(card.name);
  const at = title.indexOf(` ${name} `);
  if (at === -1) fail("print", `Title doesn't contain "${card.name}"`);
  else if (MECHANIC_SUFFIX.test(title.slice(at + name.length + 2)) && !MECHANIC_SUFFIX.test(name.split(" ").pop() ?? ""))
    fail("print", "Different card variant in title (e.g. ex/V/GX)");

  const numbers = [...rawTitle.matchAll(/(?<![\w/])([a-z]{0,3})0*(\d{1,3})\s*\/\s*([a-z]{0,3})0*(\d{1,3})(?![\w/])/g)];
  const wantNum = card.number.replace(/^0+(?=\d)/, "").toLowerCase();
  const found = numbers.map((m) => ({ num: `${m[1]}${m[2]}`.toLowerCase(), total: Number(m[4]) }));
  if (found.length === 0) {
    unsure("print", "Collector number not in title");
  } else {
    const hit = found.find(
      (f) =>
        f.num.replace(/^([a-z]*)0*/, "$1") === wantNum.replace(/^([a-z]*)0*/, "$1") &&
        (card.setPrintedTotal === null || /^[a-z]/.test(wantNum) || f.total === card.setPrintedTotal),
    );
    if (!hit) fail("print", `Different collector number in title (${found.map((f) => `${f.num}/${f.total}`).join(", ")})`);
  }

  // Finish
  const saysReverse = /\breverse\b|\brev holo\b|\brh\b/.test(rawTitle);
  const says1st = /\b1st\b|first edition/.test(rawTitle);
  if (sel.finish === "reverseHolofoil" && !saysReverse) unsure("finish", "Reverse holo not stated in title");
  if (sel.finish !== "reverseHolofoil" && sel.finish !== "other" && saysReverse) fail("finish", "Listing is a reverse holo");
  if (sel.finish.startsWith("1stEdition") && !says1st) unsure("finish", "1st Edition not stated");
  if (!sel.finish.startsWith("1stEdition") && says1st) fail("finish", "Listing is 1st Edition");
  if (sel.finish === "other") unsure("finish", "You weren't sure of the finish");

  // Language
  const listedLang = Object.entries(LANGUAGE_WORDS).find(([, re]) => re.test(rawTitle))?.[0] ?? null;
  if (sel.lang === "en" && listedLang) fail("language", `Listing appears to be ${listedLang.toUpperCase()}, not English`);
  if (sel.lang !== "en" && listedLang !== sel.lang) {
    if (listedLang) fail("language", `Listing language (${listedLang.toUpperCase()}) differs`);
    else unsure("language", "Language not stated in title");
  }

  // Grading
  const isGraded = listing.conditionId === "2750" || GRADED.test(rawTitle);
  if (sel.grading === "raw") {
    if (isGraded) fail("grading", "Listing is a graded card");
  } else {
    const want = new RegExp(`\\b${sel.grader}\\s*(gem\\s*mint\\s*|mint\\s*)?${sel.grade?.replace(".", "\\.")}\\b`, "i");
    if (!isGraded) fail("grading", "Listing is not graded");
    else if (sel.grader === "Other") unsure("grading", "Grader can't be verified");
    else if (!want.test(listing.title)) fail("grading", `Not ${sel.grader} ${sel.grade}`);
  }

  // Condition (raw only): prefer structured descriptors, then title
  if (sel.grading === "raw" && sel.condition) {
    const c =
      listing.conditionDescriptors.map(parseCondition).find(Boolean) ??
      (listing.condition ? parseCondition(listing.condition) : null) ??
      parseCondition(listing.title);
    if (!c) unsure("condition", "Card condition not stated");
    else if (CONDITION_ORDER.indexOf(c) > CONDITION_ORDER.indexOf(sel.condition)) fail("condition", `Condition ${c} is below ${sel.condition}`);
  }

  // Seller credibility
  if (listing.sellerFeedbackPct === null || listing.sellerFeedbackScore === null) unsure("seller", "Seller feedback unknown");
  else if (listing.sellerFeedbackPct < policy.minFeedbackPct || listing.sellerFeedbackScore < policy.minFeedbackScore)
    unsure("seller", `Low seller feedback (${listing.sellerFeedbackPct}% of ${listing.sellerFeedbackScore})`);

  const values = Object.values(checks);
  const verdict = values.includes("mismatch") ? "mismatch" : values.includes("unknown") ? "unverified" : "match";
  return { verdict, checks, reasons };
}
