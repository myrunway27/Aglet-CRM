import { describe, expect, it } from "vitest";
import { contrast, frameDiff, nextSteady, STEADY_TICKS, toGray } from "@/lib/steady";

const frame = (fn: (i: number) => number, n = 64 * 48) => Uint8Array.from({ length: n }, (_, i) => fn(i));

describe("auto-capture steadiness", () => {
  it("converts RGBA to gray", () => {
    expect([...toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]))]).toEqual([255, 0]);
  });
  it("measures motion and contrast", () => {
    const card = frame((i) => (i % 64 < 32 ? 40 : 220));
    expect(frameDiff(card, card)).toBe(0);
    expect(frameDiff(card, frame((i) => (i % 64 < 32 ? 220 : 40)))).toBe(180);
    expect(contrast(card)).toBeGreaterThan(80);
    expect(contrast(frame(() => 10))).toBe(0);
  });
  it("snaps only after several still frames with something in view", () => {
    let t = 0;
    for (let i = 0; i < STEADY_TICKS; i++) t = nextSteady(t, 2, 60);
    expect(t).toBe(STEADY_TICKS);
    expect(nextSteady(t, 30, 60)).toBe(0); // moved
    expect(nextSteady(3, 1, 5)).toBe(0); // blank / covered lens
  });
});
