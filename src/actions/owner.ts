"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, VERIFY_REQUIRED_ERROR } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function submitClaim(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const businessId = String(formData.get("businessId") ?? "");
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { error: "Business not found." };
  if (!user) redirect(`/login?next=/business/${business.slug}/claim`);
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const evidence = String(formData.get("evidence") ?? "").trim();
  if (evidence.length < 20) {
    return {
      error:
        "Please give us enough to verify you: a business email or phone we can check, a link to the business website mentioning you, or similar (at least 20 characters).",
    };
  }
  if (business.ownerId) return { error: "This business already has a verified owner." };

  const existing = await prisma.ownerClaim.findUnique({
    where: { businessId_userId: { businessId, userId: user.id } },
  });
  if (existing?.status === "PENDING") return { error: "Your claim is already pending review." };
  if (existing?.status === "APPROVED") return { error: "You already own this business." };

  if (existing) {
    await prisma.ownerClaim.update({
      where: { id: existing.id },
      data: { evidence: evidence.slice(0, 2000), status: "PENDING" },
    });
  } else {
    await prisma.ownerClaim.create({
      data: { businessId, userId: user.id, evidence: evidence.slice(0, 2000) },
    });
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
