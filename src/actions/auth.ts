"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { confirmVerificationCode, issueVerificationCode } from "@/lib/verification";

export type FormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password) },
  });
  await createSession(user.id);
  await issueVerificationCode(user.id);
  redirect(`/verify?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}`);
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Wrong email or password." };
  }
  if (user.isBanned) return { error: "This account has been suspended." };

  await createSession(user.id);
  const safeNext = next.startsWith("/") ? next : "/";
  if (!user.emailVerifiedAt) {
    redirect(`/verify?next=${encodeURIComponent(safeNext)}`);
  }
  redirect(safeNext);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function verifyEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/verify");

  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "/");

  const result = await confirmVerificationCode(user.id, code);
  if (result.error) return { error: result.error };
  redirect(next.startsWith("/") ? next : "/");
}

export async function resendCode(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/verify");
  const result = await issueVerificationCode(user.id);
  return result.error ? { error: result.error } : {};
}
