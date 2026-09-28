/**
 * Generates the synthetic fixture card photos in fixtures/ocr/. Each <name>.png
 * is paired with <name>.txt: the text the mock OCR provider returns for it.
 * Run: npx tsx scripts/make-fixtures.ts  (outputs are committed)
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

interface Fixture {
  name: string;
  ocrText: string;
  title: string;
  hp: string;
  footer: string;
  color: string;
  rotate?: number;
  glare?: boolean;
}

const FIXTURES: Fixture[] = [
  {
    name: "pikachu-alpha",
    title: "Pikachu",
    hp: "HP 60",
    footer: "025/198 FXA",
    color: "#facc15",
    ocrText: "BASIC\nPikachu HP 60\nGnaw 10\nThunder Jolt 50\nweakness x2 resistance retreat 1\nIllus. Demo Artist\n025/198 FXA\n©2026 Fixture",
  },
  {
    name: "pikachu-beta-fr-rotated",
    title: "Pikachu",
    hp: "PV 60",
    footer: "O25/1O8",
    color: "#fde047",
    rotate: 90,
    ocrText: "DE BASE\nPikachu PV 60\nÉclair 20\nfaiblesse résistance retraite\nO25/1O8\n©2025 Fixture",
  },
  {
    name: "charizard-glare",
    title: "Charizard",
    hp: "HP 1?0",
    footer: "(glare)",
    color: "#f97316",
    glare: true,
    ocrText: "STAGE 2\nCharizard HP 1\nEvolves from Charmeleon\nFire Spin\n",
  },
  {
    name: "unreadable",
    title: "",
    hp: "",
    footer: "",
    color: "#94a3b8",
    glare: true,
    ocrText: "~~ ;; @@\n|| ::\n",
  },
];

function svg(f: Fixture) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880" viewBox="0 0 630 880">
  <rect width="630" height="880" rx="30" fill="#1e293b"/>
  <rect x="24" y="24" width="582" height="832" rx="18" fill="${f.color}"/>
  <text x="50" y="90" font-family="DejaVu Sans, sans-serif" font-size="44" font-weight="bold" fill="#111827">${f.title}</text>
  <text x="580" y="90" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="32" fill="#b91c1c">${f.hp}</text>
  <rect x="50" y="120" width="530" height="360" fill="#e2e8f0" stroke="#111827" stroke-width="4"/>
  <text x="315" y="310" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#475569">SYNTHETIC TEST FIXTURE</text>
  <rect x="50" y="520" width="530" height="220" fill="#fff7ed" opacity="0.7"/>
  <text x="50" y="820" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#111827">${f.footer}</text>
  ${f.glare ? '<ellipse cx="330" cy="400" rx="260" ry="160" fill="#ffffff" opacity="0.85"/>' : ""}
</svg>`;
}

async function main() {
  const dir = path.join(process.cwd(), "fixtures", "ocr");
  for (const f of FIXTURES) {
    let img = sharp(Buffer.from(svg(f))).resize(420);
    if (f.rotate) img = sharp(await img.png().toBuffer()).rotate(f.rotate);
    await writeFile(path.join(dir, `${f.name}.png`), await img.png({ compressionLevel: 9 }).toBuffer());
    await writeFile(path.join(dir, `${f.name}.txt`), f.ocrText);
    console.log("wrote", f.name);
  }
}

void main();
