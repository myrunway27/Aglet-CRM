/**
 * Structured server logging. Only pass non-sensitive scalar fields: never image
 * bytes, OCR text, API keys, credentials or personal data.
 */
type Field = string | number | boolean | null | undefined;

export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, Field> = {}): void {
  const line = JSON.stringify({ level, event, ...fields, t: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Error summary safe to log: name and code only (messages can echo input). */
export function errInfo(err: unknown): Record<string, Field> {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    const status = (err as { status?: unknown }).status;
    return {
      err: err.name,
      code: typeof code === "string" || typeof code === "number" ? code : undefined,
      status: typeof status === "number" ? status : undefined,
    };
  }
  return { err: "unknown" };
}
