import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { env } from "../env";
import { sendMail } from "../mail";

export type TokenPurpose = "verify" | "reset";
const TTL: Record<TokenPurpose, number> = { verify: 48 * 3_600_000, reset: 3_600_000 };
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Create a single-use token (older unused ones for the same purpose are invalidated). */
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const client = db()!;
  const token = randomBytes(32).toString("base64url");
  await client.$transaction([
    client.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    client.emailToken.create({ data: { userId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL[purpose]) } }),
  ]);
  return token;
}

/** Consume a token: returns its userId if valid, unused and unexpired; marks it used. */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const client = db()!;
  const row = await client.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) return null;
  // Conditional update so two concurrent uses can't both succeed.
  const r = await client.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1 ? row.userId : null;
}

export async function sendVerification(userId: string, email: string) {
  const token = await issueToken(userId, "verify");
  const link = `${env().APP_URL}/verify?token=${token}`;
  return sendMail({
    to: email,
    subject: "Confirm your Card Compass email",
    text: `Confirm your email address for Card Compass:\n\n${link}\n\nThis link expires in 48 hours. If you didn't sign up, ignore this email.`,
  });
}

export async function sendPasswordReset(userId: string, email: string) {
  const token = await issueToken(userId, "reset");
  const link = `${env().APP_URL}/reset?token=${token}`;
  return sendMail({
    to: email,
    subject: "Reset your Card Compass password",
    text: `Someone asked to reset the password for this Card Compass account.\n\n${link}\n\nThis link expires in 1 hour and works once. If it wasn't you, ignore this email; your password hasn't changed.`,
  });
}
