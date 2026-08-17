"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStandard } from "@/lib/diet";

export type SimpleState = { error?: string; ok?: boolean } | undefined;

// "Want to go" / "Been there" — one tap, far cheaper than writing a review,
// and the main reason a browser becomes a member.
export async function toggleSave(businessId: string, kind: "WANT" | "BEEN") {
  const user = await getCurrentUser();
  if (!user) return;

  const existing = await prisma.save.findUnique({
    where: { userId_businessId_kind: { userId: user.id, businessId, kind } },
  });
  if (existing) {
    await prisma.save.delete({ where: { id: existing.id } });
  } else {
    await prisma.save.create({ data: { userId: user.id, businessId, kind } });
    // Marking somewhere "been" supersedes wanting to go.
    if (kind === "BEEN") {
      await prisma.save
        .delete({ where: { userId_businessId_kind: { userId: user.id, businessId, kind: "WANT" } } })
        .catch(() => {});
    }
  }
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { slug: true },
  });
  if (business) revalidatePath(`/business/${business.slug}`);
  revalidatePath("/account");
}

// Confirming a dietary claim is still true. Cheap enough that a tap is fine;
// the unique constraint keeps it one vote per person per claim.
export async function confirmTag(businessId: string, tag: string, stillTrue: boolean) {
  const user = await getCurrentUser();
  if (!user || !user.emailVerifiedAt) return;
  if (!isStandard(tag)) return;

  await prisma.tagConfirmation.upsert({
    where: { businessId_userId_tag: { businessId, userId: user.id, tag } },
    create: { businessId, userId: user.id, tag, stillTrue },
    update: { stillTrue, createdAt: new Date() },
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { slug: true },
  });
  if (business) revalidatePath(`/business/${business.slug}`);
}

export async function createList(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (title.length < 3) return { error: "Give the list a name (3+ characters)." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const isPublic = formData.get("isPublic") === "on";
  // The slug is the share credential, so it has to be unguessable.
  const slug = `${randomBytes(8).toString("hex")}`;

  await prisma.userList.create({
    data: { slug, userId: user.id, title, note, isPublic },
  });
  revalidatePath("/lists");
  return { ok: true };
}

export async function addToList(listId: string, businessId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const list = await prisma.userList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== user.id) return;

  const count = await prisma.listItem.count({ where: { listId } });
  await prisma.listItem
    .create({ data: { listId, businessId, position: count } })
    .catch(() => {}); // already on the list
  revalidatePath(`/list/${list.slug}`);
}

export async function removeFromList(listId: string, businessId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const list = await prisma.userList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== user.id) return;

  await prisma.listItem.deleteMany({ where: { listId, businessId } });
  revalidatePath(`/list/${list.slug}`);
}

export async function deleteList(listId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const list = await prisma.userList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== user.id) return;
  await prisma.userList.delete({ where: { id: listId } });
  revalidatePath("/lists");
}
