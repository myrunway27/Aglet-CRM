import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { db } from "../db";

export const SESSION_COOKIE = "cc_session";
const SESSION_DAYS = 30;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Mark the cookie Secure whenever the request arrived over HTTPS (directly or via a proxy). */
export function isHttps(req: Request): boolean {
  return new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
}

export async function createSession(userId: string, req: Request): Promise<void> {
  const client = db();
  if (!client) throw new Error("Accounts need a database (DATABASE_URL)");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await client.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db()?.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
}

export type SafeUser = Pick<User, "id" | "email" | "country" | "emailVerifiedAt" | "emailAlerts">;

/** The signed-in user, or null. Never throws (a DB outage means "signed out"). */
export async function currentUser(): Promise<SafeUser | null> {
  const client = db();
  if (!client) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  try {
    const s = await client.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true, country: true, emailVerifiedAt: true, emailAlerts: true } } },
    });
    if (!s || s.expiresAt < new Date()) return null;
    return s.user;
  } catch {
    return null;
  }
}
