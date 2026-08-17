"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generatePseudonym, isValidPenName, PEN_NAME_MAX, PEN_NAME_MIN } from "@/lib/pseudonym";
import { storeStandards } from "@/lib/diet";

export type PenNameState = { error?: string; ok?: boolean } | undefined;

// Renaming updates the user AND all their existing reviews: the pen name is
// one identity, not a per-review disguise.
async function applyPenName(userId: string, pseudonym: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { pseudonym } }),
    prisma.review.updateMany({ where: { userId }, data: { pseudonym } }),
  ]);
  revalidatePath("/account");
}

export async function rerollPenName(): Promise<PenNameState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  let pseudonym = generatePseudonym();
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.user.findFirst({ where: { pseudonym, id: { not: user.id } } }))) break;
    pseudonym = generatePseudonym();
  }
  await applyPenName(user.id, pseudonym);
  return { ok: true };
}

export async function choosePenName(_prev: PenNameState, formData: FormData): Promise<PenNameState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("penName") ?? "").replace(/\s+/g, " ").trim();
  if (!isValidPenName(name)) {
    return {
      error: `Pen names are ${PEN_NAME_MIN}–${PEN_NAME_MAX} characters: letters, numbers and spaces only.`,
    };
  }
  if (name.toLowerCase() === user.email.split("@")[0].toLowerCase()) {
    return { error: "That looks like part of your email — pick something that doesn't identify you." };
  }
  const taken = await prisma.user.findFirst({
    where: { pseudonym: name, id: { not: user.id } },
  });
  if (taken) return { error: "That pen name is taken — try another." };

  await applyPenName(user.id, name);
  return { ok: true };
}

// A person's own dietary line. Kept private — it's sensitive, and it never
// appears on reviews or any public page.
export async function saveDietStandard(
  _prev: PenNameState,
  formData: FormData
): Promise<PenNameState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const dietStandard = storeStandards(formData.getAll("standards").map(String));
  await prisma.user.update({ where: { id: user.id }, data: { dietStandard } });
  revalidatePath("/account");
  revalidatePath("/");
  return { ok: true };
}
