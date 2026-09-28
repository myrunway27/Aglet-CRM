import fixtures from "./mock-fixtures.json";
import type { OcrInput, OcrProvider, OcrResult } from "./provider";

interface Fixture {
  file: string;
  sha256: string;
  text: string;
  locale: string | null;
}

/**
 * Deterministic OCR for local development and tests: returns the recorded text
 * for the fixture images in fixtures/scans, and empty text for anything else.
 */
export class MockOcr implements OcrProvider {
  readonly id = "mock" as const;
  private byHash = new Map((fixtures as Fixture[]).map((f) => [f.sha256, f]));

  async extractText({ originalSha256 }: OcrInput): Promise<OcrResult> {
    const f = this.byHash.get(originalSha256);
    return { text: f?.text ?? "", locale: f?.locale ?? null };
  }
}
