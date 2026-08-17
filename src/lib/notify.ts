import "server-only";
import { prisma } from "./db";
import { sendMail } from "./mailer";

/** Creates an in-app notification and, by default, also emails the user. */
export async function notifyUser(
  userId: string,
  message: string,
  link: string,
  { email = true }: { email?: boolean } = {}
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isBanned) return;

  await prisma.notification.create({ data: { userId, message, link } });

  if (email && user.emailVerifiedAt) {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendMail(user.email, `True Review: ${message}`, `${message}\n\n${base}${link}`);
  }
}
