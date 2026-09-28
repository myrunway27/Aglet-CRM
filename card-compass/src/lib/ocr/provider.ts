export interface OcrInput {
  /** Sanitized JPEG (orientation applied, metadata stripped). */
  image: Buffer;
  /** SHA-256 of the original upload, used only by the mock provider. */
  originalSha256: string;
}

export interface OcrResult {
  text: string;
  /** Locale reported by the OCR engine, if any. */
  locale: string | null;
}

/** OCR extracts text only; it does not identify the card, its finish or condition. */
export interface OcrProvider {
  readonly id: "mock" | "vision";
  extractText(input: OcrInput): Promise<OcrResult>;
}
