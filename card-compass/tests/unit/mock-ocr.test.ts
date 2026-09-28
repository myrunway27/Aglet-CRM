import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fixtures from "@/lib/ocr/mock-fixtures.json";
import { MockOcr } from "@/lib/ocr/mock";
import { sha256 } from "@/lib/server/image";

describe("MockOcr fixtures", () => {
  it("manifest hashes match the committed fixture images", () => {
    for (const f of fixtures) {
      const buf = readFileSync(path.resolve("fixtures/scans", f.file));
      expect(sha256(buf), f.file).toBe(f.sha256);
    }
  });

  it("returns recorded text for fixtures and empty text otherwise", async () => {
    const ocr = new MockOcr();
    const first = fixtures[0]!;
    expect((await ocr.extractText({ image: Buffer.alloc(0), originalSha256: first.sha256 })).text).toBe(first.text);
    expect((await ocr.extractText({ image: Buffer.alloc(0), originalSha256: "0".repeat(64) })).text).toBe("");
  });
});
