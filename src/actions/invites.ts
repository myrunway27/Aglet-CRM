"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { canInvite } from "@/lib/membership";

export type InviteState = { error?: string; sent?: number; skipped?: number } | undefined;

const MAX_PER_BATCH = 50;
const MAX_PER_MONTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// An owner invites their customers to review. Compliance is structural, not
// advisory: the same neutral message goes to every address, there is no way
// to preselect happy customers within a batch, nothing is offered in
// exchange, and each address gets one invitation per business, ever.
export async function sendInvites(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const businessId = String(formData.get("businessId") ?? "");
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.ownerId !== user.id) {
    return { error: "Only the verified owner can invite customers." };
  }
  if (!canInvite(user)) {
    return { error: "Customer invitations start with the Growth plan ($14.99/mo)." };
  }

  const raw = String(formData.get("emails") ?? "");
  const emails = [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => EMAIL_RE.test(e))
    ),
  ];
  if (emails.length === 0) {
    return { error: "Paste at least one valid email address." };
  }
  if (emails.length > MAX_PER_BATCH) {
    return { error: `Up to ${MAX_PER_BATCH} addresses per batch.` };
  }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = await prisma.reviewInvite.count({
    where: { ownerId: user.id, sentAt: { gte: monthAgo } },
  });
  if (recent + emails.length > MAX_PER_MONTH) {
    return {
      error: `That would pass the limit of ${MAX_PER_MONTH} invitations per month (${recent} already sent).`,
    };
  }

  let sent = 0;
  let skipped = 0;
  for (const email of emails) {
    // One invitation per address per business — resending forever is nagging.
    const existing = await prisma.reviewInvite.findFirst({
      where: { businessId, email },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const token = randomBytes(16).toString("hex");
    await prisma.reviewInvite.create({
      data: { businessId, ownerId: user.id, email, token },
    });
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendMail(
      email,
      `How was ${business.name}?`,
      `${business.name} would like to hear about your visit — good or bad.\n\n` +
        `Reviews on True Review are 100% anonymous: the business never learns who wrote what, ` +
        `and your honest opinion is what keeps ratings worth reading.\n\n` +
        `Write your review here:\n${base}/business/${business.slug}?invite=${token}\n\n` +
        `If you'd rather not, just ignore this email — this is the only invitation you'll get.\n\n` +
        `— True Review · reviewed by the people, for the people`
    );
    sent++;
  }

  revalidatePath("/owner");
  return { sent, skipped };
}
