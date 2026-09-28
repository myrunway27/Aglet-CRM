import "server-only";
import { env } from "../server/env";
import { MockOcr } from "./mock";
import type { OcrProvider } from "./provider";
import { VisionOcr } from "./vision";

let instance: OcrProvider | undefined;

export function ocr(): OcrProvider {
  instance ??= env().OCR_PROVIDER === "vision" ? new VisionOcr(env().OUTBOUND_TIMEOUT_MS) : new MockOcr();
  return instance;
}
