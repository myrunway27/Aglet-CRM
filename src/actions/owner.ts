"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, VERIFY_REQUIRED_ERROR } from "@/lib/auth";
import { emailMatchesBusiness } from "@/lib/claims";
import { sendMail } from "@/lib/mailer";
import { notifyUser } from "@/lib/notify";

export type FormState = { error?: string; ok?: boolean } | undefined;
export type ClaimEmailState =
  | { error?: string; mismatch?: boolean; codeSent?: boolean; approved?: boolean }
  | undefined;

const CLAIM_CODE_TTL_MS = 30 * 60 * 1000;
const CLAIM_RESEND_COOLDOWN_MS = 60 * 1000;

// Shared guards for both claim paths. Returns the business or a form error.
async function claimPreflight(businessId: string) {
  const user = await getCurrentUser();
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { error: "Business not found." as const };
  if (!user) redirect(`/login?next=/business/${business.slug}/claim`);
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };
  if (business.ownerId) return { error: "This business already has a verified owner." as const };

  const existing = await prisma.ownerClaim.findUnique({
    where: { businessId_userId: { businessId, userId: user.id } },
  });
  if (existing?.status === "APPROVED") return { error: "You already own this business." as const };
  return { user, business, existing };
}

// Instant path, step 1: the claimant gives an email at the business's own
// domain and we send a one-time code there. Control of that inbox is the
// ownership proof, so no admin review is needed.
export async function startEmailClaim(
  _prev: ClaimEmailState,
  formData: FormData
): Promise<ClaimEmailState> {
  const businessId = String(formData.get("businessId") ?? "");
  const email = String(formData.get("claimEmail") ?? "").trim().toLowerCase();

  const pre = await claimPreflight(businessId);
  if ("error" in pre) return { error: pre.error };
  const { user, business, existing } = pre;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That doesn't look like an email address." };
  }
  if (!emailMatchesBusiness(email, business.name, business.website)) {
    return { mismatch: true };
  }
  if (
    existing?.verifyCodeIssuedAt &&
    Date.now() - existing.verifyCodeIssuedAt.getTime() < CLAIM_RESEND_COOLDOWN_MS
  ) {
    return { error: "A code was just sent — wait a minute before requesting another." };
  }

  const code = String(randomInt(100000, 1000000));
  const data = {
    method: "EMAIL",
    status: "PENDING",
    evidence: `Business-domain email verification: ${email}`,
    claimEmail: email,
    verifyCode: code,
    verifyCodeExpiresAt: new Date(Date.now() + CLAIM_CODE_TTL_MS),
    verifyCodeIssuedAt: new Date(),
  };
  if (existing) {
    await prisma.ownerClaim.update({ where: { id: existing.id }, data });
  } else {
    await prisma.ownerClaim.create({ data: { businessId, userId: user.id, ...data } });
  }

  await sendMail(
    email,
    `${code} is your True Review owner-verification code`,
    `Someone signed in to The True Review as ${user.email} is claiming ${business.name} and entered this address as the business's own email.\n\nTheir verification code is: ${code}\n\nEnter it on the claim page to confirm — it expires in 30 minutes.\n\nIf this wasn't you or anyone at your business, just ignore this email; the claim will not go through.`
  );
  return { codeSent: true };
}

// Instant path, step 2: the code proves inbox control — approve on the spot.
export async function confirmEmailClaim(
  _prev: ClaimEmailState,
  formData: FormData
): Promise<ClaimEmailState> {
  const businessId = String(formData.get("businessId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const pre = await claimPreflight(businessId);
  if ("error" in pre) return { error: pre.error };
  const { user, business, existing } = pre;

  if (
    !existing ||
    existing.method !== "EMAIL" ||
    !existing.verifyCode ||
    !existing.verifyCodeExpiresAt ||
    existing.verifyCodeExpiresAt < new Date()
  ) {
    return { error: "That code has expired. Request a new one.", codeSent: true };
  }
  if (existing.verifyCode !== code) {
    return { error: "That code doesn't match. Check the email and try again.", codeSent: true };
  }

  await prisma.$transaction([
    prisma.ownerClaim.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        verifyCode: null,
        verifyCodeExpiresAt: null,
        verifyCodeIssuedAt: null,
      },
    }),
    prisma.business.update({ where: { id: businessId }, data: { ownerId: user.id } }),
    // Only one approved owner per business
    prisma.ownerClaim.updateMany({
      where: { businessId, id: { not: existing.id }, status: "PENDING" },
      data: { status: "REJECTED" },
    }),
  ]);

  await notifyUser(
    user.id,
    `You are now the verified owner of ${business.name} — you can reply to reviews`,
    "/owner"
  );
  revalidatePath(`/business/${business.slug}`);
  revalidatePath("/admin");
  redirect("/owner?claimed=1");
}

export async function submitClaim(_prev: FormState, formData: FormData): Promise<FormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const pre = await claimPreflight(businessId);
  if ("error" in pre) return { error: pre.error };
  const { user, existing } = pre;

  const evidence = String(formData.get("evidence") ?? "").trim();
  if (evidence.length < 20) {
    return {
      error:
        "Please give us enough to verify you: a business email or phone we can check, a link to the business website mentioning you, or similar (at least 20 characters).",
    };
  }
  if (existing?.status === "PENDING" && existing.method === "MANUAL") {
    return { error: "Your claim is already pending review." };
  }

  const data = {
    evidence: evidence.slice(0, 2000),
    status: "PENDING",
    method: "MANUAL",
    claimEmail: null,
    verifyCode: null,
    verifyCodeExpiresAt: null,
    verifyCodeIssuedAt: null,
  };
  if (existing) {
    await prisma.ownerClaim.update({ where: { id: existing.id }, data });
  } else {
    await prisma.ownerClaim.create({ data: { businessId, userId: user.id, ...data } });
  }
  return { ok: true };
}

export async function replyToReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const reviewId = String(formData.get("reviewId") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  if (text.length < 5) return { error: "Reply is too short." };
  if (text.length > 2000) return { error: "Replies are limited to 2000 characters." };

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { business: true },
  });
  if (!review) return { error: "Review not found." };
  if (review.business.ownerId !== user.id) {
    return { error: "Only the verified owner of this business can reply." };
  }

  await prisma.ownerReply.upsert({
    where: { reviewId },
    create: { reviewId, text },
    update: { text },
  });

  revalidatePath(`/business/${review.business.slug}`);
  revalidatePath("/owner");
  return { ok: true };
}
