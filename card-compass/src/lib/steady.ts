/**
 * Auto-capture helpers: decide when the camera picture is steady enough to
 * snap. Works on small grayscale frames (e.g. 64×48) sampled a few times a second.
 */
export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  return out;
}

/** Mean absolute difference between two frames (0–255). */
export function frameDiff(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** Standard deviation of brightness: near zero for a blank, covered or black frame. */
export function contrast(a: Uint8Array): number {
  let sum = 0;
  for (const v of a) sum += v;
  const mean = sum / a.length;
  let sq = 0;
  for (const v of a) sq += (v - mean) ** 2;
  return Math.sqrt(sq / a.length);
}

export const STEADY_DIFF = 6; // below this the picture is "still"
export const MIN_CONTRAST = 18; // below this there's nothing worth scanning
export const STEADY_TICKS = 4; // consecutive still checks before snapping (~1 s at 250 ms)

/** Next steady-tick count given the latest frame comparison. */
export function nextSteady(ticks: number, diff: number, frameContrast: number): number {
  return diff < STEADY_DIFF && frameContrast >= MIN_CONTRAST ? ticks + 1 : 0;
}
