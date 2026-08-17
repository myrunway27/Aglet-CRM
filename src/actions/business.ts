"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, VERIFY_REQUIRED_ERROR } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { CATEGORIES } from "@/lib/categories";
import { storeTags } from "@/lib/tags";

export type FormState = { error?: string } | undefined;

export async function addBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/add-business");
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const tags = storeTags(formData.getAll("tags").map(String));
  const address = String(formData.get("address") ?? "").trim().slice(0, 160);
  const zip = String(formData.get("zip") ?? "").trim().slice(0, 12);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  const hours = String(formData.get("hours") ?? "").trim().slice(0, 200);
  let website = String(formData.get("website") ?? "").trim().slice(0, 120);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

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
      tags,
      address,
      zip,
      phone,
      website,
      hours,
      slug: slugify(`${name} ${city}`),
      addedById: user.id,
    },
  });

  redirect(`/business/${business.slug}`);
}
