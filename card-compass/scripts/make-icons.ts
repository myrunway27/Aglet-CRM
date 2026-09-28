/** Generates the app icons (PNG) from an inline SVG. Run: npx tsx scripts/make-icons.ts */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4338ca"/>
  <g transform="translate(256 256) scale(${1 - pad})">
    <circle r="190" fill="none" stroke="#ffffff" stroke-width="28"/>
    <polygon points="0,-150 38,0 0,150 -38,0" fill="#ffffff"/>
    <polygon points="0,-150 38,0 -38,0" fill="#facc15"/>
    <circle r="18" fill="#4338ca"/>
  </g>
</svg>`;

async function main() {
  const any = Buffer.from(svg(0.08));
  const maskable = Buffer.from(svg(0.3)); // content inside the 80% safe zone
  await writeFile("public/icons/icon-192.png", await sharp(any).resize(192).png().toBuffer());
  await writeFile("public/icons/icon-512.png", await sharp(any).resize(512).png().toBuffer());
  await writeFile("public/icons/maskable-512.png", await sharp(maskable).resize(512).png().toBuffer());
  await writeFile("src/app/apple-icon.png", await sharp(maskable).resize(180).png().toBuffer());
  await writeFile("src/app/icon.png", await sharp(any).resize(64).png().toBuffer());
  console.log("icons written");
}
void main();
