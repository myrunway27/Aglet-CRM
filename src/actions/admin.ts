"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function decideClaim(claimId: string, approve: boolean) {
  await requireAdmin();
  const claim = await prisma.ownerClaim.findUniqueOrThrow({ where: { id: claimId } });

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

  revalidatePath("/admin");
  revalidatePath(`/business/${review.business.slug}`);
}
