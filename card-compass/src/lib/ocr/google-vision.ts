import { UpstreamError } from "../errors";
import { fetchJsonWithRetry, type FetchLike } from "../http";
import type { OcrProvider, OcrResult } from "./types";

const ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { code?: number; message?: string };
  }>;
}

/**
 * Google Cloud Vision TEXT_DETECTION. This is generic text extraction, not a
 * Pokémon card identifier: matching happens in our own parser + catalog lookup.
 * Image bytes are sent inline; nothing is stored by this app.
 */
export class GoogleVisionOcrProvider implements OcrProvider {
  readonly id = "google" as const;

  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs: number,
    private readonly fetchImpl?: FetchLike,
  ) {}

  async extractText(image: Buffer): Promise<OcrResult> {
    const body = JSON.stringify({
      requests: [
        {
          image: { content: image.toString("base64") },
          features: [{ type: "TEXT_DETECTION" }],
          // Cards are printed in many languages; let Vision auto-detect.
        },
      ],
    });
    const res = await fetchJsonWithRetry<VisionResponse>(
      ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
        body,
      },
      { timeoutMs: this.timeoutMs, retries: 1, fetchImpl: this.fetchImpl },
    );
    const r = res.responses?.[0];
    if (r?.error) throw new UpstreamError(`Vision error ${r.error.code ?? ""}`.trim(), r.error.code);
    const text = r?.fullTextAnnotation?.text ?? r?.textAnnotations?.[0]?.description ?? "";
    return { provider: "google", text, warnings: [] };
  }
}
