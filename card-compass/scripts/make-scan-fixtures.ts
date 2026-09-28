/**
 * Generates the card-like fixture images used by the mock OCR provider and the
 * E2E test, plus src/lib/ocr/mock-fixtures.json mapping each image's SHA-256
 * to the text a real OCR engine would be expected to return.
 *
 * Run: npm run fixtures:scans
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface Spec {
  file: string;
  title: string;
  lines: string[];
  /** Text the mock OCR returns for this image (may differ from what is drawn, e.g. scripts). */
  ocrText: string;
  locale: string | null;
  glare?: boolean;
  rotate?: number;
}

const specs: Spec[] = [
  {
    file: "pikachu-dsa.png",
    title: "Pikachu",
    lines: ["BASIC   HP 60", "Weakness  Resistance  Retreat", "Illus. Demo Artist", "DSA  025/198"],
    ocrText: "BASIC\nPikachu\nHP 60\nWeakness Resistance Retreat\nIllus. Demo Artist\nDSA 025/198\n©2026 Demo",
    locale: "en",
  },
  {
    file: "pikachu-no-setcode.png",
    title: "Pikachu",
    lines: ["BASIC   HP 60", "Weakness  Resistance  Retreat", "025/198"],
    ocrText: "BASIC\nPikachu\nHP 60\nWeakness Resistance Retreat\n025/198",
    locale: "en",
  },
  {
    file: "charizard-glare.png",
    title: "Charizard ex",
    lines: ["STAGE 2   HP 330", "Weakness  Retreat", "0O6/198"],
    // Glare hides part of the name; OCR confuses 0 and O in the number.
    ocrText: "STAGE 2\nCharizrd ex\nHP 330\nWeakness Retreat\n0O6/198",
    locale: "en",
    glare: true,
  },
  {
    file: "eevee-rotated.png",
    title: "Eevee",
    lines: ["BASIC   HP 70", "DSA  TG05/TG30"],
    ocrText: "BASIC\nEevee\nHP 70\nDSA TG05/TG30",
    locale: "en",
    rotate: 90,
  },
  {
    file: "pikachu-japanese.png",
    title: "Pikachu (JP sample)",
    lines: ["たね   HP 60", "025/198"],
    ocrText: "たね\nピカチュウ\nHP 60\n弱点 抵抗力 にげる\n025/198",
    locale: "ja",
  },
  {
    file: "blank-back.png",
    title: "",
    lines: [],
    ocrText: "",
    locale: null,
  },
];

function svg(spec: Spec): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = spec.lines
    .map((l, i) => `<text x="40" y="${560 + i * 56}" font-size="30" font-family="DejaVu Sans, sans-serif" fill="#1f2937">${esc(l)}</text>`)
    .join("");
  const glare = spec.glare
    ? `<defs><radialGradient id="g" cx="0.35" cy="0.12" r="0.35"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="630" height="880" fill="url(#g)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880">
  <rect width="630" height="880" rx="28" fill="${spec.title ? "#f6d365" : "#2f5bd3"}"/>
  <rect x="24" y="24" width="582" height="832" rx="18" fill="${spec.title ? "#fff7d6" : "#1f3c8c"}"/>
  ${spec.title ? `<text x="40" y="92" font-size="44" font-weight="bold" font-family="DejaVu Sans, sans-serif" fill="#111827">${esc(spec.title)}</text>
  <rect x="40" y="120" width="550" height="360" rx="8" fill="#fde68a" stroke="#b45309"/>
  <text x="315" y="315" font-size="28" text-anchor="middle" font-family="DejaVu Sans, sans-serif" fill="#92400e">TEST FIXTURE</text>` : ""}
  ${body}${glare}
</svg>`;
}

async function main() {
  const outDir = path.resolve("fixtures/scans");
  mkdirSync(outDir, { recursive: true });
  const manifest = [];
  for (const spec of specs) {
    let img = sharp(Buffer.from(svg(spec))).png({ compressionLevel: 9 });
    if (spec.rotate) img = sharp(await img.toBuffer()).rotate(spec.rotate).png({ compressionLevel: 9 });
    const buf = await img.toBuffer();
    writeFileSync(path.join(outDir, spec.file), buf);
    manifest.push({
      file: spec.file,
      sha256: createHash("sha256").update(buf).digest("hex"),
      text: spec.ocrText,
      locale: spec.locale,
    });
  }
  writeFileSync(path.resolve("src/lib/ocr/mock-fixtures.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`wrote ${manifest.length} fixtures`);
}

void main();
