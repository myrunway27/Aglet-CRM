import { normalizeNumber } from "./normalize";

export interface ParsedCardText {
  name: string | null;
  /** Normalized collector number without the set total ("025/198" -> "25"). */
  number: string | null;
  /** Printed set total after the slash, when it is purely numeric. */
  setTotal: number | null;
  /** The collector-number token exactly as recognized, after cautious OCR fixes. */
  rawNumber: string | null;
  hp: number | null;
  /** Human-readable notes about normalization applied (shown to the user). */
  notes: string[];
}

// Line-leading labels that are not the card name (several languages).
const STAGE_PREFIX =
  /^(basic|basis|base|básico|basico|stage\s*[12]|phase\s*[12]|niveau\s*[12]|stufe\s*[12]|fase\s*[12]|v?star|vmax|mega|restored|trainer|dresseur)\b[\s:]*/i;
const NOT_NAME =
  /^(evolves from|entwickelt sich aus|évolution de|weakness|resistance|retreat|illus|©|pok[eé]mon|ability|trainer|supporter|item|energy|put |once during|attach|flip|draw|search|discard|your opponent)/i;
// HP label in EN/FR/DE/IT/ES and the number either side.
const HP_AFTER = /^(.*?\p{L}.*?)\s*(?:HP|PV|KP|PS)\s*(\d{2,3})\b/iu;
const HP_BEFORE = /^(.*?\p{L}.*?)\s*(\d{2,3})\s*(?:HP|PV|KP|PS)\b/iu;

/** Collector number "025/198", "TG05/TG30", "GG01/GG70". Digit slots tolerate O/I/l misreads. */
// Letter prefixes (TG, GG, H…) never start with O/I, which are treated as misread digits.
const NUMBER_RE =
  /(?<![\p{L}\p{N}/])([A-HJ-NP-Z][A-Z]{0,2})?([0-9OIl]{1,3})\s*[/⁄∕]\s*([A-HJ-NP-Z][A-Z]{0,2})?([0-9OIl]{1,3})(?![\p{L}\p{N}/])/u;
const PROMO_RE = /(?<![\p{L}\p{N}])(SWSH|SVP|SM|XY|BW)\s?(\d{2,3})(?![\p{L}\p{N}])/u;

function fixDigits(s: string): { value: string; changed: boolean } {
  const value = s.replace(/[O]/g, "0").replace(/[Il]/g, "1");
  return { value, changed: value !== s };
}

function cleanName(raw: string): string | null {
  let s = raw.replace(STAGE_PREFIX, "").trim();
  s = s.replace(STAGE_PREFIX, "").trim();
  s = s.replace(/[|_~*•·]+/g, " ").replace(/\s+/g, " ").trim();
  // Keep letters (any script), digits, spaces, apostrophes, hyphens, dots, ♀/♂.
  s = s.replace(/[^\p{L}\p{N} '’.\-♀♂&]/gu, "").trim();
  if (s.length < 2 || s.length > 40) return null;
  if (!/\p{L}{2,}/u.test(s)) return null;
  return s;
}

export function parseCardText(text: string): ParsedCardText {
  const notes: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Collector number
  let number: string | null = null;
  let setTotal: number | null = null;
  let rawNumber: string | null = null;
  for (const line of lines) {
    const m = NUMBER_RE.exec(line);
    if (!m) continue;
    const left = fixDigits(m[2]);
    const right = fixDigits(m[4]);
    // Require at least one genuine digit on each side, so "IO/OI" is not a number.
    if (!/\d/.test(m[2]) || !/\d/.test(m[4])) continue;
    if (left.changed || right.changed) notes.push(`Read "${m[0].trim()}" as a collector number; letters that look like digits were corrected.`);
    const prefix = m[1] ?? "";
    number = normalizeNumber(prefix + left.value);
    rawNumber = `${prefix}${left.value}/${m[3] ?? ""}${right.value}`;
    setTotal = m[3] ? null : Number(right.value);
    break;
  }
  if (!number) {
    for (const line of lines) {
      const p = PROMO_RE.exec(line);
      if (p) {
        number = `${p[1]}${p[2]}`;
        rawNumber = number;
        notes.push("Looks like a promo number; set total is not printed on promos.");
        break;
      }
    }
  }

  // Name + HP
  let name: string | null = null;
  let hp: number | null = null;
  for (const line of lines.slice(0, 8)) {
    const m = HP_AFTER.exec(line) ?? HP_BEFORE.exec(line);
    if (m) {
      const n = cleanName(m[1]);
      if (n) {
        name = n;
        hp = Number(m[2]);
        break;
      }
    }
  }
  if (!name) {
    for (const line of lines.slice(0, 6)) {
      if (NOT_NAME.test(line)) continue;
      if (NUMBER_RE.test(line)) continue;
      const stripped = line
        .replace(STAGE_PREFIX, "")
        .replace(/\s*\b(?:HP|PV|KP|PS)\b.*$/i, "")
        .trim();
      if (!stripped) continue;
      const n = cleanName(stripped);
      if (n && n.split(" ").length <= 4) {
        name = n;
        notes.push("Name guessed from the top of the card; please check it.");
        break;
      }
    }
  }

  if (!name && !number) notes.push("No card name or collector number could be read.");
  return { name, number, setTotal, rawNumber, hp, notes };
}
