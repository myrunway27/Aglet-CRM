import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkUpload, sanitizeImage, sniffMime } from "@/lib/server/image";

async function jpegWithExif(orientation = 6) {
  return sharp({ create: { width: 40, height: 20, channels: 3, background: "#f00" } })
    .jpeg()
    .withMetadata({ orientation, exif: { IFD0: { Copyright: "secret-owner", Artist: "someone" } } })
    .toBuffer();
}

describe("checkUpload", () => {
  it("accepts a real JPEG", async () => {
    const buf = await jpegWithExif();
    expect(checkUpload(buf, "image/jpeg", 1_000_000)).toEqual({ ok: true, mime: "image/jpeg" });
  });

  it("rejects empty, oversized and unsupported files", async () => {
    const buf = await jpegWithExif();
    expect(checkUpload(new Uint8Array(), "image/jpeg", 10)).toMatchObject({ ok: false, code: "empty" });
    expect(checkUpload(buf, "image/jpeg", 10)).toMatchObject({ ok: false, code: "too_large" });
    expect(checkUpload(buf, "image/gif", 1_000_000)).toMatchObject({ ok: false, code: "unsupported_type" });
    expect(checkUpload(new TextEncoder().encode("<svg/>"), "image/png", 1_000_000)).toMatchObject({ ok: false });
  });

  it("sniffs by content, not by label", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).png().toBuffer();
    expect(sniffMime(png)).toBe("image/png");
    expect(checkUpload(png, "image/jpeg", 1_000_000)).toEqual({ ok: true, mime: "image/png" });
  });
});

describe("sanitizeImage", () => {
  it("applies EXIF rotation and strips metadata", async () => {
    const out = await sanitizeImage(await jpegWithExif(6));
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([20, 40]); // rotated 90°
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(out.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("bounds very large images", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#fff" } }).png().toBuffer();
    const meta = await sharp(await sanitizeImage(big)).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(2000);
  });
});
