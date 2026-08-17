"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { refreshBusinessScore } from "@/lib/rating";
import { notifyUser } from "@/lib/notify";

export type DisputeState = { error?: string; ok?: boolean } | undefined;

// An owner disputes a review with evidence. Unlike Trustpilot — where an
// unanswered dispute deletes the review after 7 days — nothing here is ever
// removed for silence. An upheld dispute only drops the review out of the
// score; it stays readable, which is the whole point.
export async function flagReview(_prev: DisputeState, formData: FormData): Promise<DisputeState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const reviewId = String(formData.get("reviewId") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (evidence.length < 30) {
    return {
      error:
        "Please explain what's wrong and what evidence you have — at least 30 characters. Disliking a review isn't grounds on its own.",
    };
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { business: true },
  });
  if (!review) return { error: "Review not found." };
  if (review.business.ownerId !== user.id) {
    return { error: "Only the verified owner of this business can dispute its reviews." };
  }

  const existing = await prisma.reviewFlag.findUnique({
    where: { reviewId_ownerId: { reviewId, ownerId: user.id } },
  });
  if (existing) return { error: "You've already disputed this review; it's with our moderators." };

  await prisma.reviewFlag.create({
    data: { reviewId, ownerId: user.id, evidence: evidence.slice(0, 2000) },
  });

  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
  for (const admin of admins) {
    await notifyUser(admin.id, `Owner disputed a review of ${review.business.name}`, "/admin");
  }
  revalidatePath("/owner");
  return { ok: true };
}

export async function decideFlag(flagId: string, uphold: boolean) {
  await requireAdmin();
  const flag = await prisma.reviewFlag.findUniqueOrThrow({
    where: { id: flagId },
    include: { review: { include: { business: true } } },
  });

  await prisma.reviewFlag.update({
    where: { id: flagId },
    data: { status: uphold ? "UPHELD" : "DISMISSED" },
  });
  if (uphold) {
    await prisma.review.update({
      where: { id: flag.reviewId },
      data: { includedInScore: false, excludeReason: "Owner dispute upheld by a moderator" },
    });
    await refreshBusinessScore(flag.review.businessId);
  }
  revalidatePath("/admin");
  revalidatePath(`/business/${flag.review.business.slug}`);
}

// Admin: take a review out of (or back into) the score without deleting it.
export async function setReviewScored(reviewId: string, included: boolean, reason?: string) {
  await requireAdmin();
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: { business: true },
  });
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      includedInScore: included,
      excludeReason: included ? null : (reason ?? "Excluded by a moderator"),
    },
  });
  await refreshBusinessScore(review.businessId);
  revalidatePath("/admin");
  revalidatePath(`/business/${review.business.slug}`);
}

// Admin: clear a burst freeze and let the score move again.
export async function unfreezeScore(businessId: string) {
  await requireAdmin();
  await prisma.business.update({
    where: { id: businessId },
    data: { scoreFrozen: false, scoreFrozenAt: null },
  });
  await refreshBusinessScore(businessId);
  revalidatePath("/admin");
}
