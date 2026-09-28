import sharp, { type Metadata } from "sharp";
import { ValidationError } from "./errors";

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const FORMAT_TO_MIME: Record<string, (typeof ALLOWED_MIME)[number]> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const MAX_EDGE = 2000;
const MAX_INPUT_PIXELS = 40_000_000;

export interface SanitizedImage {
  data: Buffer;
  mime: (typeof ALLOWED_MIME)[number];
  width: number;
  height: number;
}

/**
 * Validate an upload by its actual bytes (not the claimed MIME), auto-rotate per
 * EXIF, downscale, and re-encode. Re-encoding drops EXIF/GPS/XMP metadata.
 * Works in memory only; nothing is written to disk.
 */
export async function sanitizeImage(
  input: Buffer,
  claimedMime: string,
  maxBytes: number,
): Promise<SanitizedImage> {
  if (input.byteLength === 0) throw new ValidationError("The file is empty.");
  if (input.byteLength > maxBytes) {
    throw new ValidationError(`Image is too large (max ${Math.floor(maxBytes / 1_000_000)} MB).`);
  }
  if (!(ALLOWED_MIME as readonly string[]).includes(claimedMime)) {
    throw new ValidationError("Unsupported file type. Use JPEG, PNG or WebP.");
  }
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ValidationError("The file is not a readable image.");
  }
  const mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!mime) throw new ValidationError("Unsupported image format. Use JPEG, PNG or WebP.");

  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // apply EXIF orientation, then orientation tag is dropped
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const out =
    mime === "image/png"
      ? pipeline.png()
      : mime === "image/webp"
        ? pipeline.webp({ quality: 90 })
        : pipeline.jpeg({ quality: 90 });
  const { data, info } = await out.toBuffer({ resolveWithObject: true });
  return { data, mime, width: info.width, height: info.height };
}
