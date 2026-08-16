"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { CATEGORIES } from "@/lib/categories";

export type FormState = { error?: string } | undefined;

export async function addBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/add-business");

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);

  if (name.length < 2 || name.length > 100) {
    return { error: "Business name must be 2–100 characters." };
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Please pick a category." };
  }
  if (city.length < 2 || city.length > 60) {
    return { error: "Please enter the city (2–60 characters)." };
  }

  const duplicate = await prisma.business.findFirst({
    where: { name: { equals: name }, city: { equals: city } },
  });
  if (duplicate) {
    return { error: `"${name}" in ${city} is already listed.` };
  }

  const business = await prisma.business.create({
    data: {
      name,
      category,
      city,
      description,
      slug: slugify(`${name} ${city}`),
      addedById: user.id,
    },
  });

  redirect(`/business/${business.slug}`);
}
