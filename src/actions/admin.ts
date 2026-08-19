"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

export async function decideClaim(claimId: string, approve: boolean) {
  await requireAdmin();
  const claim = await prisma.ownerClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: { business: true },
  });

  if (approve) {
    await prisma.$transaction([
      prisma.ownerClaim.update({ where: { id: claimId }, data: { status: "APPROVED" } }),
      prisma.business.update({
        where: { id: claim.businessId },
        data: { ownerId: claim.userId },
      }),
      // Only one approved owner per business
      prisma.ownerClaim.updateMany({
        where: { businessId: claim.businessId, id: { not: claimId }, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
    ]);
  } else {
    await prisma.ownerClaim.update({ where: { id: claimId }, data: { status: "REJECTED" } });
  }
  await notifyUser(
    claim.userId,
    approve
      ? `Your owner claim for ${claim.business.name} was approved — you can now reply to reviews`
      : `Your owner claim for ${claim.business.name} was not approved`,
    approve ? "/owner" : `/business/${claim.business.slug}`
  );
  revalidatePath("/admin");
}

export async function moderateReview(reviewId: string, action: "hide" | "clear") {
  await requireAdmin();
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: { business: true },
  });

  await prisma.review.update({
    where: { id: reviewId },
    data:
      action === "hide"
        ? { status: "HIDDEN" }
        : { status: "PUBLISHED", flagReason: null },
  });
  await prisma.report.updateMany({
    where: { reviewId, status: "OPEN" },
    data: { status: action === "hide" ? "REVIEW_HIDDEN" : "DISMISSED" },
  });

  if (action === "hide") {
    await notifyUser(
      review.userId,
      `Your review of ${review.business.name} was removed by moderators`,
      "/account",
      { email: false }
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/business/${review.business.slug}`);
}

// Grant or revoke business membership. Manual until a payment provider is
// connected; months <= 0 revokes.
export async function setMembership(
  userId: string,
  months: number,
  tier: "starter" | "growth" | "spotlight" = "starter"
) {
  await requireAdmin();
  const active = months > 0;
  await prisma.user.update({
    where: { id: userId },
    data: {
      proUntil: active ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) : null,
      proTier: active ? tier : null,
    },
  });
  revalidatePath("/admin");
}
