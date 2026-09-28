export interface OcrResult {
  provider: "mock" | "google";
  text: string;
  /** Provider-level caveats to show the user (e.g. mock only knows fixtures). */
  warnings: string[];
}

export interface OcrProvider {
  readonly id: "mock" | "google";
  extractText(image: Buffer, mime: string): Promise<OcrResult>;
}
