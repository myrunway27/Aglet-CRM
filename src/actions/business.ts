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
import { sendMail } from "@/lib/mailer";

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
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase().slice(0, 120);
  let website = String(formData.get("website") ?? "").trim().slice(0, 120);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  // Only the name is required. Everything else can be filled in later — a
  // half-finished listing is far better than one nobody bothered to add.
  if (name.length < 2 || name.length > 100) {
    return { error: "Please give the business a name (2–100 characters)." };
  }
  if (category && !(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "That category isn't one of the options." };
  }
  if (city.length > 60) {
    return { error: "City name is too long." };
  }

  const duplicate = await prisma.business.findFirst({
    where: { name: { equals: name }, city: { equals: city } },
  });
  if (duplicate) {
    return { error: `"${name}"${city ? ` in ${city}` : ""} is already listed.` };
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
      contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? contactEmail : "",
      hours,
      slug: slugify(city ? `${name} ${city}` : name),
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

  // Tell the business it has been listed — once, ever. Claiming is free;
  // membership is pitched for replies, not for control of the listing.
  if (business.contactEmail) {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendMail(
      business.contactEmail,
      `${business.name} is now listed on True Review`,
      `Hello,\n\n${business.name} has been added to True Review, a review site where ` +
        `customers post 100% anonymously.\n\nYou can claim your listing for free — verify ` +
        `you're the owner and you can correct your details, see your stats, and dispute ` +
        `reviews with evidence:\n${base}/business/${business.slug}/claim\n\nMembers can ` +
        `also reply publicly to reviews and invite their customers to write one.\n\n` +
        `We won't email you about this again.\n\n— True Review · truereview.me`
    );
    await prisma.business.update({
      where: { id: business.id },
      data: { notifiedAt: new Date() },
    });
  }

  redirect(`/business/${business.slug}`);
}
