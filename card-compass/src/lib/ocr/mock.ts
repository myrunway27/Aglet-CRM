import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { OcrProvider, OcrResult } from "./types";

/** Hash of decoded pixels, so lossless re-encoding (metadata stripping) keeps the key stable. */
export async function pixelHash(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  return createHash("sha256")
    .update(`${info.width}x${info.height}x${info.channels}:`)
    .update(data)
    .digest("hex");
}

/**
 * Deterministic OCR for local development and tests. Recognizes only the
 * bundled fixture images in fixtures/ocr (each <name>.png has a <name>.txt
 * holding the text a real OCR engine would plausibly return). Any other image
 * yields empty text, so the UI falls back to manual search.
 */
export class MockOcrProvider implements OcrProvider {
  readonly id = "mock" as const;
  private index: Promise<Map<string, string>> | undefined;

  constructor(private readonly dir = path.join(process.cwd(), "fixtures", "ocr")) {}

  private load(): Promise<Map<string, string>> {
    this.index ??= (async () => {
      const map = new Map<string, string>();
      const files = (await readdir(this.dir)).filter((f) => f.endsWith(".png"));
      for (const f of files) {
        const img = await readFile(path.join(this.dir, f));
        const text = await readFile(path.join(this.dir, f.replace(/\.png$/, ".txt")), "utf8");
        map.set(await pixelHash(img), text);
      }
      return map;
    })();
    return this.index;
  }

  async extractText(image: Buffer): Promise<OcrResult> {
    const index = await this.load();
    const text = index.get(await pixelHash(image));
    return {
      provider: "mock",
      text: text ?? "",
      warnings: text
        ? ["Mock OCR: text comes from a bundled test fixture, not real recognition."]
        : ["Mock OCR only recognizes the bundled fixture images. Use manual search, or configure Google Cloud Vision."],
    };
  }
}
