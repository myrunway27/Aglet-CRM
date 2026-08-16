import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "./db";
import { sendMail } from "./mailer";

const CODE_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function issueVerificationCode(userId: string): Promise<{ error?: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return {};

  if (
    user.verifyCodeIssuedAt &&
    Date.now() - user.verifyCodeIssuedAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return { error: "A code was just sent — wait a minute before requesting another." };
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyCode: code,
      verifyCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      verifyCodeIssuedAt: new Date(),
    },
  });

  await sendMail(
    user.email,
    `${code} is your True Review verification code`,
    `Welcome to The True Review!\n\nYour verification code is: ${code}\n\nIt expires in 30 minutes. If you didn't sign up, you can ignore this email.\n\nRemember: your email is never shown on reviews — you post under a random pen name.`
  );
  return {};
}

export async function confirmVerificationCode(
  userId: string,
  code: string
): Promise<{ error?: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return {};

  if (
    !user.verifyCode ||
    !user.verifyCodeExpiresAt ||
    user.verifyCodeExpiresAt < new Date()
  ) {
    return { error: "That code has expired. Request a new one." };
  }
  if (user.verifyCode !== code.trim()) {
    return { error: "That code doesn't match. Check the email and try again." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      verifyCode: null,
      verifyCodeExpiresAt: null,
      verifyCodeIssuedAt: null,
    },
  });
  return {};
}
