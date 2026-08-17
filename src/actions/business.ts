"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, VERIFY_REQUIRED_ERROR } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { CATEGORIES } from "@/lib/categories";
import { storeTags } from "@/lib/tags";
import { storeStandards } from "@/lib/diet";
import { parseTimeToMinutes } from "@/lib/hours";
import { refreshCityRanks } from "@/lib/rank";

export type FormState = { error?: string } | undefined;

export async function addBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/add-business");
  if (!user.emailVerifiedAt) return { error: VERIFY_REQUIRED_ERROR };

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const tagPart = storeTags(formData.getAll("tags").map(String));
  const stdPart = storeStandards(formData.getAll("standards").map(String));
  // Tags and dietary sub-standards share one comma-wrapped column; each
  // parser filters by its own vocabulary.
  const tags = [tagPart, stdPart].filter(Boolean).join("").replace(/,,/g, ",") || "";
  const certifier = String(formData.get("certifier") ?? "").trim().slice(0, 40);
  const priceLevel = Math.min(4, Math.max(0, Number(formData.get("priceLevel") ?? 0) || 0));
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
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
      certifier,
      priceLevel,
      lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
      lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
      address,
      zip,
      phone,
      website,
      hours,
      slug: slugify(`${name} ${city}`),
      addedById: user.id,
    },
  });

  // Structured opening hours, one row per day per span.
  const spans: { dayOfWeek: number; openMin: number; closeMin: number }[] = [];
  for (let day = 0; day < 7; day++) {
    const open = parseTimeToMinutes(String(formData.get(`open_${day}`) ?? ""));
    const close = parseTimeToMinutes(String(formData.get(`close_${day}`) ?? ""));
    if (open === null || close === null) continue;
    // A closing time at or before opening means the span runs past midnight.
    spans.push({ dayOfWeek: day, openMin: open, closeMin: close <= open ? close + 1440 : close });
  }
  if (spans.length > 0) {
    await prisma.openingHour.createMany({
      data: spans.map((s) => ({ ...s, businessId: business.id })),
    });
  }

  await refreshCityRanks(business.city, business.category);
  redirect(`/business/${business.slug}`);
}
