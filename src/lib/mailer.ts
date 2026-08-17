import "server-only";
import { prisma } from "./db";

/**
 * Sends email via SMTP when SMTP_HOST/SMTP_PORT (+ optional SMTP_USER/SMTP_PASS,
 * SMTP_FROM) are configured. Without SMTP config, emails are only recorded in
 * the EmailOutbox table, which admins can read at /admin/outbox — so the full
 * flow works in local development with no provider.
 */
export async function sendMail(to: string, subject: string, body: string) {
  let sentVia = "outbox";

  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? "True Review <no-reply@localhost>",
        to,
        subject,
        text: body,
      });
      sentVia = "smtp";
    } catch (err) {
      console.error("SMTP send failed, keeping mail in outbox:", err);
    }
  }

  await prisma.emailOutbox.create({ data: { to, subject, body, sentVia } });
}
