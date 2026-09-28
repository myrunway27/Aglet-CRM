import type { OcrInput, OcrProvider, OcrResult } from "./provider";

/**
 * Google Cloud Vision TEXT_DETECTION. Authenticates with Application Default
 * Credentials (GOOGLE_APPLICATION_CREDENTIALS or an attached service account).
 * Vision returns text; card identification is done by our matcher + the buyer.
 */
export class VisionOcr implements OcrProvider {
  readonly id = "vision" as const;
  private clientPromise: Promise<import("@google-cloud/vision").ImageAnnotatorClient> | undefined;

  constructor(private readonly timeoutMs: number) {}

  private client() {
    this.clientPromise ??= import("@google-cloud/vision").then((m) => new m.ImageAnnotatorClient());
    return this.clientPromise;
  }

  async extractText({ image }: OcrInput): Promise<OcrResult> {
    const client = await this.client();
    const [batch] = await client.batchAnnotateImages(
      { requests: [{ image: { content: image }, features: [{ type: "TEXT_DETECTION" }] }] },
      { timeout: this.timeoutMs },
    );
    const result = batch.responses?.[0];
    if (result?.error?.message) throw new Error("Vision returned an error");
    const first = result?.textAnnotations?.[0];
    return {
      text: result?.fullTextAnnotation?.text ?? first?.description ?? "",
      locale: first?.locale ?? null,
    };
  }
}
