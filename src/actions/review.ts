"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, VERIFY_REQUIRED_ERROR } from "@/lib/auth";
import { generatePseudonym } from "@/lib/pseudonym";
import { detectSuspiciousReview, isOverDailyLimit, MAX_REVIEWS_PER_DAY } from "@/lib/moderation";
import { notifyUser } from "@/lib/notify";

export type FormState = { error?: string } | undefined;

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function postReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "");
  if (!user) redirect(`/login?next=/business/${slug}`);
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const businessId = String(formData.get("businessId") ?? "");
  const rating = Number(formData.get("rating"));
  const text = String(formData.get("text") ?? "").trim();

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { error: "Business not found." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please pick a star rating." };
  }
  if (text.length < 30) {
    return { error: "Please write at least 30 characters — reviews need substance to be useful." };
  }
  if (text.length > 4000) {
    return { error: "Reviews are limited to 4000 characters." };
  }
  if (business.ownerId === user.id) {
    return { error: "You can't review your own business." };
  }

  const existing = await prisma.review.findUnique({
    where: { businessId_userId: { businessId, userId: user.id } },
  });
  if (existing) {
    return { error: "You've already reviewed this business. Each account can review a business once." };
  }

  if (await isOverDailyLimit(user.id)) {
    return { error: `You've reached the limit of ${MAX_REVIEWS_PER_DAY} reviews in 24 hours. Try again tomorrow.` };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS);
  for (const photo of photos) {
    if (!PHOTO_TYPES[photo.type]) return { error: "Photos must be JPEG, PNG, or WebP." };
    if (photo.size > MAX_PHOTO_BYTES) return { error: "Each photo must be under 4 MB." };
  }

  const flagReason = await detectSuspiciousReview({
    userId: user.id,
    businessId,
    rating,
    text,
  });

  const savedPaths: string[] = [];
  if (photos.length > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    for (const photo of photos) {
      const filename = `${randomBytes(12).toString("hex")}${PHOTO_TYPES[photo.type]}`;
      await writeFile(path.join(uploadDir, filename), Buffer.from(await photo.arrayBuffer()));
      savedPaths.push(`/uploads/${filename}`);
    }
  }

  await prisma.review.create({
    data: {
      businessId,
      userId: user.id,
      rating,
      text,
      pseudonym: generatePseudonym(),
      status: flagReason ? "FLAGGED" : "PUBLISHED",
      flagReason,
      photos: { create: savedPaths.map((p) => ({ path: p })) },
    },
  });

  if (business.ownerId) {
    await notifyUser(
      business.ownerId,
      `New ${rating}-star anonymous review on ${business.name}`,
      `/business/${business.slug}`
    );
  }

  revalidatePath(`/business/${business.slug}`);
  redirect(`/business/${business.slug}?posted=1${flagReason ? "&flagged=1" : ""}`);
}

export async function toggleHelpful(reviewId: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/business/${slug}`);
  if (!user.emailVerifiedAt) redirect(`/verify?next=/business/${slug}`);

  const existing = await prisma.helpfulVote.findUnique({
    where: { reviewId_userId: { reviewId, userId: user.id } },
  });
  if (existing) {
    await prisma.helpfulVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.helpfulVote.create({ data: { reviewId, userId: user.id } });
  }
  revalidatePath(`/business/${slug}`);
}

export async function reportReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "");
  if (!user) redirect(`/login?next=/business/${slug}`);
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const reviewId = String(formData.get("reviewId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length < 10) {
    return { error: "Please explain why this review should be checked (at least 10 characters)." };
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return { error: "Review not found." };
  if (review.userId === user.id) return { error: "You can't report your own review." };

  const existing = await prisma.report.findUnique({
    where: { reviewId_reporterId: { reviewId, reporterId: user.id } },
  });
  if (existing) return { error: "You've already reported this review. An admin will look at it." };

  await prisma.report.create({
    data: { reviewId, reporterId: user.id, reason: reason.slice(0, 1000) },
  });

  revalidatePath(`/business/${slug}`);
  return {};
}
