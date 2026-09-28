import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import { fetchJsonWithRetry } from "./http";
import { log } from "./log";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export const OUTBOX_DIR = path.join(process.cwd(), ".outbox");

/**
 * Send an email. Providers:
 * - outbox: writes JSON files to ./.outbox (local development and tests only)
 * - resend: Resend HTTPS API (RESEND_API_KEY)
 * - none: email disabled (returns false)
 * Never throws: a mail failure must not break the request that triggered it.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const e = env();
  try {
    if (e.MAIL_PROVIDER === "none") return false;
    if (e.MAIL_PROVIDER === "outbox") {
      await mkdir(OUTBOX_DIR, { recursive: true });
      const file = path.join(OUTBOX_DIR, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
      await writeFile(file, JSON.stringify({ from: e.MAIL_FROM, ...mail, at: new Date().toISOString() }, null, 2));
      return true;
    }
    if (!e.RESEND_API_KEY) {
      log.warn("mail.not_configured");
      return false;
    }
    await fetchJsonWithRetry(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: e.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text }),
      },
      { timeoutMs: 10_000, retries: 2 },
    );
    return true;
  } catch (err) {
    log.warn("mail.send_failed", { name: err instanceof Error ? err.name : "unknown" });
    return false;
  }
}

export const mailEnabled = () => env().MAIL_PROVIDER !== "none";
