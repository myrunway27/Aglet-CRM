/**
 * Parse OCR text from a Pokémon card into cautious search clues. Nothing here
 * decides which card it is; it only produces hints that the matcher scores and
 * the buyer confirms.
 */

export interface ScanClues {
  name: string | null;
  nameAlternates: string[];
  /** Normalized collector number, e.g. "25", "TG05". */
  number: string | null;
  /** Printed denominator for plain numbers (e.g. 198 for 025/198). */
  printedTotal: number | null;
  /** Raw collector-number text as read, e.g. "025/198". */
  numberRaw: string | null;
  setCodes: string[];
  languageHint: string | null;
  lines: string[];
}

const DIGITISH = "0-9OoIl";

function fixDigits(s: string): string {
  return s.replace(/[Oo]/g, "0").replace(/[Il]/g, "1");
}

/** Canonical form for comparing collector numbers: upper-case, no leading zeros in the digit run. */
export function normalizeNumber(n: string): string {
  const up = n.toUpperCase().replace(/\s+/g, "");
  const m = /^([A-Z]*)(\d+)([A-Z]*)$/.exec(up);
  if (!m) return up;
  const [, pre = "", digits = "", post = ""] = m;
  return `${pre}${String(Number(digits))}${post}`;
}

export function parseCollectorNumber(
  text: string,
): { number: string; printedTotal: number | null; raw: string } | null {
  const slash = new RegExp(
    `(?<![A-Za-z0-9])([A-Z]{0,3})([${DIGITISH}]{1,3})\\s?/\\s?([A-Z]{0,3})([${DIGITISH}]{1,3})(?![A-Za-z0-9])`,
    "g",
  );
  const found: Array<{ number: string; printedTotal: number | null; raw: string; plausible: boolean }> = [];
  for (const m of text.matchAll(slash)) {
    const [raw, pre = "", numRaw = "", totPre = "", totRaw = ""] = m;
    const num = fixDigits(numRaw);
    const tot = fixDigits(totRaw);
    // A pure-letter token like "lO" would become digits; require at least one real digit.
    if (!/\d/.test(numRaw) || !/\d/.test(totRaw)) continue;
    const numInt = Number(num);
    const totInt = Number(tot);
    if (!Number.isFinite(numInt) || !Number.isFinite(totInt) || totInt === 0) continue;
    const prefixed = pre.length > 0;
    found.push({
      number: prefixed ? `${pre}${num}` : String(numInt),
      printedTotal: prefixed || totPre ? null : totInt,
      raw: raw.replace(/\s+/g, ""),
      // Secret rares exceed the printed total, so this only breaks ties.
      plausible: prefixed ? pre === totPre : numInt <= totInt * 1.5,
    });
  }
  const best = found.find((f) => f.plausible) ?? found[0];
  if (best) return { number: best.number, printedTotal: best.printedTotal, raw: best.raw };

  const promo = /(?<![A-Za-z0-9])(SWSH|SVP|SM|XY|BW)\s?(\d{2,3})(?![A-Za-z0-9])/.exec(text);
  if (promo) return { number: `${promo[1]}${promo[2]}`, printedTotal: null, raw: promo[0] };
  return null;
}

const NOISE = [
  /^basic\b/i,
  /^stage\s*\d/i,
  /^evolves?\s+from/i,
  /^(weakness|resistance|retreat|illus|trainer|supporter|item|energy|ability|pok[eé]mon\s*(power|tool)?)\b/i,
  /©|nintendo|creatures|game\s*freak/i,
  /^(hp|ex|gx|v|vmax|vstar)$/i,
  /^\d/,
];

function cleanLine(line: string): string {
  return line
    .replace(/\bHP\s*\d{2,3}\b|\b\d{2,3}\s*HP\b/gi, "")
    .replace(/[^\p{L}\p{N}\s'’.:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLanguage(text: string): string | null {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return "Japanese";
  if (/\p{Script=Hangul}/u.test(text)) return "Korean";
  if (/\p{Script=Han}/u.test(text)) return "Chinese";
  if (/(faiblesse|résistance|retraite)/i.test(text)) return "French";
  if (/\b(schw[äa]che|r[üu]ckzug|resistenz)\b/i.test(text)) return "German";
  if (/\b(debolezza|resistenza|ritirata)\b/i.test(text)) return "Italian";
  if (/\b(debilidad|resistencia|retirada)\b/i.test(text)) return "Spanish";
  if (/\b(weakness|resistance|retreat)\b/i.test(text)) return "English";
  return null;
}

const NOT_SET_CODES = new Set(["HP", "EX", "GX", "V", "VMAX", "VSTAR", "LV", "TG", "GG", "SV", "PSA", "BGS", "CGC"]);

export function parseClues(text: string): ScanClues {
  const normalized = text.normalize("NFKC");
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const num = parseCollectorNumber(normalized);

  const names: string[] = [];
  for (const line of lines) {
    if (NOISE.some((re) => re.test(line))) continue;
    const c = cleanLine(line);
    if (c.length < 3 || c.length > 32) continue;
    if (!/\p{L}{3,}/u.test(c)) continue;
    if (!names.includes(c)) names.push(c);
    if (names.length >= 3) break;
  }

  const setCodes = [
    ...new Set(
      [...normalized.matchAll(/(?<![A-Za-z0-9])([A-Z]{2,4})(?![A-Za-z0-9])/g)]
        .map((m) => m[1] ?? "")
        .filter((c) => c && !NOT_SET_CODES.has(c)),
    ),
  ].slice(0, 5);

  return {
    name: names[0] ?? null,
    nameAlternates: names.slice(1),
    number: num?.number ?? null,
    printedTotal: num?.printedTotal ?? null,
    numberRaw: num?.raw ?? null,
    setCodes,
    languageHint: detectLanguage(normalized),
    lines,
  };
}
