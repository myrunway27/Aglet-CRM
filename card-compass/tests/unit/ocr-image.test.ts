import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/errors";
import { sanitizeImage } from "@/lib/image";
import { GoogleVisionOcrProvider } from "@/lib/ocr/google-vision";
import { MockOcrProvider } from "@/lib/ocr/mock";

const fx = (n: string) => readFileSync(path.join(__dirname, "../../fixtures/ocr", n));

describe("sanitizeImage", () => {
  it("rejects oversized, empty and unsupported uploads", async () => {
    await expect(sanitizeImage(Buffer.alloc(0), "image/png", 1000)).rejects.toBeInstanceOf(ValidationError);
    await expect(sanitizeImage(Buffer.alloc(2000), "image/png", 1000)).rejects.toThrow(/too large/);
    await expect(sanitizeImage(fx("pikachu-alpha.png"), "image/gif", 8e6)).rejects.toThrow(/Unsupported/);
    await expect(sanitizeImage(Buffer.from("not an image"), "image/png", 8e6)).rejects.toThrow(/not a readable image/);
  });

  it("detects a MIME mismatch by content", async () => {
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).gif().toBuffer();
    await expect(sanitizeImage(gif, "image/png", 8e6)).rejects.toThrow(/Unsupported image format/);
  });

  it("strips EXIF/GPS metadata and applies orientation", async () => {
    const withExif = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#f00" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Make: "SecretPhoneCo" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await sanitizeImage(withExif, "image/jpeg", 8e6);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("SecretPhoneCo"))).toBe(false);
    expect([out.width, out.height]).toEqual([20, 40]); // rotated per orientation 6
  });
});

describe("MockOcrProvider", () => {
  it("recognizes a fixture after sanitizing (pixel hash survives re-encoding)", async () => {
    const ocr = new MockOcrProvider(path.join(__dirname, "../../fixtures/ocr"));
    const clean = await sanitizeImage(fx("pikachu-alpha.png"), "image/png", 8e6);
    const r = await ocr.extractText(clean.data);
    expect(r.text).toContain("025/198");
  });

  it("returns empty text for unknown images", async () => {
    const ocr = new MockOcrProvider(path.join(__dirname, "../../fixtures/ocr"));
    const other = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).png().toBuffer();
    const r = await ocr.extractText(other);
    expect(r.text).toBe("");
    expect(r.warnings[0]).toMatch(/only recognizes/);
  });
});

describe("GoogleVisionOcrProvider", () => {
  it("sends TEXT_DETECTION with the key in a header and returns full text", async () => {
    const f = vi.fn(async () => Response.json({ responses: [{ fullTextAnnotation: { text: "Pikachu HP 60\n025/198" } }] }));
    const p = new GoogleVisionOcrProvider("vkey", 1000, f as unknown as typeof fetch);
    const r = await p.extractText(Buffer.from("img"));
    expect(r.text).toBe("Pikachu HP 60\n025/198");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("vkey");
    expect(JSON.parse(init.body as string).requests[0].features[0].type).toBe("TEXT_DETECTION");
  });

  it("surfaces per-image API errors", async () => {
    const f = vi.fn(async () => Response.json({ responses: [{ error: { code: 3, message: "bad image" } }] }));
    const p = new GoogleVisionOcrProvider("vkey", 1000, f as unknown as typeof fetch);
    await expect(p.extractText(Buffer.from("img"))).rejects.toThrow(/Vision error 3/);
  });
});
