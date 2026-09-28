import { createHash } from "node:crypto";

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export type UploadCheck =
  | { ok: true; mime: AllowedMime }
  | { ok: false; code: "empty" | "too_large" | "unsupported_type" | "content_mismatch"; message: string };

export function sniffMime(buf: Uint8Array): AllowedMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return "image/png";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export function checkUpload(buf: Uint8Array, declaredMime: string, maxBytes: number): UploadCheck {
  if (buf.length === 0) return { ok: false, code: "empty", message: "The file is empty." };
  if (buf.length > maxBytes)
    return {
      ok: false,
      code: "too_large",
      message: `Image is larger than ${Math.round(maxBytes / 1_000_000)} MB. Try a smaller photo.`,
    };
  if (!(ALLOWED_MIME as readonly string[]).includes(declaredMime))
    return { ok: false, code: "unsupported_type", message: "Use a JPEG, PNG or WebP image." };
  const sniffed = sniffMime(buf);
  if (!sniffed) return { ok: false, code: "unsupported_type", message: "Use a JPEG, PNG or WebP image." };
  // Browsers sometimes mislabel JPEG/PNG; the bytes decide, but the declared type must also be an image we accept.
  return { ok: true, mime: sniffed };
}

export function sha256(buf: Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Decode and re-encode in memory: applies EXIF orientation (fixes sideways phone
 * photos), bounds size, and drops all metadata (EXIF/GPS/ICC). Nothing touches disk.
 */
export async function sanitizeImage(buf: Uint8Array): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf, { limitInputPixels: 50_000_000, failOn: "error" })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}
