import "server-only";
import { env } from "../env";
import { GoogleVisionOcrProvider } from "./google-vision";
import { MockOcrProvider } from "./mock";
import type { OcrProvider } from "./types";

let provider: OcrProvider | undefined;

export function getOcr(): OcrProvider {
  if (provider) return provider;
  const e = env();
  if (e.OCR_PROVIDER === "google") {
    if (!e.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error("OCR_PROVIDER=google requires GOOGLE_CLOUD_VISION_API_KEY");
    }
    provider = new GoogleVisionOcrProvider(e.GOOGLE_CLOUD_VISION_API_KEY, e.GOOGLE_CLOUD_VISION_TIMEOUT_MS);
  } else {
    provider = new MockOcrProvider();
  }
  return provider;
}
