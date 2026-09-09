// Import real local businesses from OpenStreetMap (ODbL — attribution shown
// in the site footer). Listings only: name, address, category, coordinates,
// hours, phone, website. Never reviews — those are for real people to write.
//
//   node scripts/import-osm.mjs --bbox "26.05,-80.32,26.22,-80.08" --city "Fort Lauderdale" --limit 220 --out osm.json
//   node scripts/import-osm.mjs --json osm.json --sql out.sql        (emit SQL instead of writing via Prisma)
//
// With DATABASE_URL set and no --sql, rows are upserted through Prisma.
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);

const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// OSM tag -> our category. Anything unmapped is skipped: an unnamed bench is
// not a business, and "Other" is not a useful listing.
const MAP = [
  [["amenity", ["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "bakery", "food_court", "juice_bar"]], "Restaurants & Cafes"],
  [["shop", ["bakery", "coffee", "deli", "pastry", "confectionery"]], "Restaurants & Cafes"],
  [["shop", ["supermarket", "convenience", "clothes", "shoes", "jewelry", "gift", "books", "florist", "furniture", "electronics", "mobile_phone", "department_store", "mall", "variety_store", "sports", "toys", "pet", "greengrocer", "butcher", "seafood", "wine", "alcohol", "bicycle", "hardware", "optician", "chemist", "kiosk"]], "Shops & Retail"],
  [["amenity", ["pharmacy", "dentist", "doctors", "clinic", "hospital", "veterinary"]], "Health & Medical"],
  [["healthcare", ["dentist", "doctor", "clinic", "physiotherapist", "optometrist", "psychotherapist", "alternative"]], "Health & Medical"],
  [["shop", ["beauty", "hairdresser", "massage", "cosmetics", "tattoo", "nails"]], "Beauty & Spa"],
  [["leisure", ["fitness_centre", "sports_centre", "swimming_pool", "dance", "bowling_alley", "golf_course"]], "Fitness & Sports"],
  [["shop", ["car_repair", "car", "car_parts", "tyres", "motorcycle_repair"]], "Auto Services"],
  [["amenity", ["car_wash", "fuel"]], "Auto Services"],
  [["craft", ["plumber", "electrician", "carpenter", "hvac", "painter", "roofer", "gardener", "cleaning"]], "Home Services"],
  [["shop", ["laundry", "dry_cleaning", "locksmith", "pest_control"]], "Home Services"],
  [["office", ["lawyer", "accountant", "insurance", "estate_agent", "financial", "architect", "notary", "tax_advisor", "it", "advertising_agency", "consulting", "coworking"]], "Professional Services"],
  [["amenity", ["bank", "coworking_space"]], "Professional Services"],
  [["amenity", ["college", "university", "language_school", "music_school", "driving_school", "dancing_school"]], "Education"],
  [["amenity", ["cinema", "theatre", "nightclub", "arts_centre", "casino"]], "Entertainment"],
  [["leisure", ["amusement_arcade", "escape_game", "water_park", "miniature_golf"]], "Entertainment"],
  [["tourism", ["hotel", "motel", "hostel", "guest_house", "museum", "attraction", "gallery"]], "Travel & Hotels"],
];

function categorize(t) {
  for (const [[key, vals], cat] of MAP) if (vals.includes(t[key])) return cat;
  return null;
}

// Our own slug rules, kept in sync with src/lib/slug.ts.
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// "Mo-Fr 08:00-17:00; Sa 09:00-14:00" -> [{dayOfWeek, openMin, closeMin}]
// Best effort: unparseable strings are kept on Business.hours as text.
const DAYS = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
function parseHours(str) {
  if (!str) return [];
  const out = [];
  for (const rule of str.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = /^([A-Za-z,\- ]+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(rule) || /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(rule);
    if (!m) { if (/24\/7/.test(rule)) for (let d = 0; d < 7; d++) out.push({ dayOfWeek: d, openMin: 0, closeMin: 1439 }); continue; }
    const [dayPart, open, close] = m.length === 4 ? [m[1], m[2], m[3]] : ["Mo-Su", m[1], m[2]];
    const toMin = (t) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
    const days = new Set();
    for (const seg of dayPart.split(",").map((x) => x.trim())) {
      const r = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(seg); if (!r || !(r[1] in DAYS)) continue;
      let a = DAYS[r[1]], b = r[2] ? DAYS[r[2]] : a;
      for (let i = 0; i < 7; i++) { const d = (a + i) % 7; days.add(d); if (d === b) break; }
    }
    for (const d of days) out.push({ dayOfWeek: d, openMin: toMin(open), closeMin: toMin(close) });
  }
  return out;
}

async function fetchOSM(bbox) {
  const q = `[out:json][timeout:60];(
    nwr(${bbox})[name][amenity];
    nwr(${bbox})[name][shop];
    nwr(${bbox})[name][leisure];
    nwr(${bbox})[name][office];
    nwr(${bbox})[name][craft];
    nwr(${bbox})[name][healthcare];
    nwr(${bbox})[name][tourism];
  );out center tags;`;
  // curl rather than fetch: it honours HTTPS_PROXY in locked-down environments.
  for (const url of MIRRORS) for (let i = 0; i < 3; i++) {
    try {
      const out = execFileSync("curl", ["-sS", "--max-time", "240", "--retry", "2", "--retry-delay", "5", "-X", "POST", url, "--data-urlencode", `data=${q}`], { maxBuffer: 256 * 1024 * 1024 });
      const j = JSON.parse(out.toString("utf8"));
      if (j.elements) return j.elements;
    } catch (e) { console.error(`${url}: ${String(e.message).split("\n")[0].slice(0, 120)}`); }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("all Overpass mirrors failed");
}

const CAPS = {
  "Restaurants & Cafes": 70, "Shops & Retail": 40, "Beauty & Spa": 25, "Health & Medical": 25,
  "Fitness & Sports": 20, "Auto Services": 15, "Home Services": 15, "Professional Services": 15,
  "Entertainment": 15, "Travel & Hotels": 15, "Education": 10,
};
const PRIORITY = Object.keys(CAPS);
// --capmult 3 triples every cap: use it to pull a whole neighbourhood deeply.
const CAP_MULT = Number(arg("capmult", "1")) || 1;

function normalize(elements, cityDefault, limit) {
  const seen = new Set(); const rows = []; const count = {};
  // Chains and brands are real, but a home page of Taco Bells is not a
  // neighbourhood. Prefer independents; branded outlets come last.
  const sorted = [...elements].sort((a, b) => {
    const pa = PRIORITY.indexOf(categorize(a.tags ?? {}) ?? ""), pb = PRIORITY.indexOf(categorize(b.tags ?? {}) ?? "");
    const ba = a.tags?.brand ? 1 : 0, bb = b.tags?.brand ? 1 : 0;
    return ba - bb || pa - pb;
  });
  for (const e of sorted) {
    const t = e.tags ?? {}; const cat = categorize(t); if (!cat) continue;
    if ((count[cat] ?? 0) >= CAPS[cat] * CAP_MULT) continue;
    const name = (t.name ?? "").trim(); if (name.length < 2 || name.length > 80) continue;
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon; if (lat == null || lng == null) continue;
    const city = t["addr:city"] || cityDefault;
    const key = `${name.toLowerCase()}|${city.toLowerCase()}`; if (seen.has(key)) continue; seen.add(key);
    const address = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
    const hours = parseHours(t.opening_hours);
    const tags = [];
    if (t["diet:kosher"] === "yes") tags.push("kosher");
    if (t["diet:vegan"] === "yes") tags.push("vegan");
    if (t["diet:vegetarian"] === "yes") tags.push("vegetarian");
    if (t["diet:gluten_free"] === "yes") tags.push("gluten-free");
    if (t["diet:halal"] === "yes") tags.push("halal");
    if (t.outdoor_seating === "yes") tags.push("outdoor-seating");
    if (t.delivery === "yes") tags.push("delivery");
    if (t.takeaway === "yes") tags.push("takeout");
    if (t.wheelchair === "yes") tags.push("wheelchair-accessible");
    if (t.internet_access === "wlan" || t.internet_access === "yes") tags.push("free-wifi");
    if (t.reservation === "yes") tags.push("reservations");
    count[cat] = (count[cat] ?? 0) + 1;
    rows.push({
      id: "osm" + randomBytes(10).toString("hex"),
      slug: `${slugify(name)}-${slugify(city)}-${randomBytes(3).toString("hex")}`,
      name, category: cat, city,
      description: t.cuisine ? `${t.cuisine.split(";")[0].replace(/_/g, " ")} · listed from OpenStreetMap` : "Listed from OpenStreetMap",
      address, zip: t["addr:postcode"] ?? "", phone: t.phone ?? t["contact:phone"] ?? "", website: t.website ?? t["contact:website"] ?? "",
      hours: hours.length ? "" : (t.opening_hours ?? ""), lat, lng, tags: tags.length ? `,${tags.join(",")},` : "", openingHours: hours,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

const esc = (v) => "'" + String(v).replace(/'/g, "''") + "'";
function toSQL(rows) {
  const lines = ["BEGIN;"];
  for (const r of rows) {
    lines.push(`INSERT INTO "Business" (id, slug, name, category, city, description, address, zip, phone, website, hours, lat, lng, tags, "createdAt") VALUES (${[r.id, r.slug, r.name, r.category, r.city, r.description, r.address, r.zip, r.phone, r.website, r.hours].map(esc).join(", ")}, ${r.lat}, ${r.lng}, ${esc(r.tags)}, now()) ON CONFLICT (slug) DO NOTHING;`);
    for (const h of r.openingHours) lines.push(`INSERT INTO "OpeningHour" (id, "businessId", "dayOfWeek", "openMin", "closeMin") VALUES (${esc("oh" + randomBytes(10).toString("hex"))}, ${esc(r.id)}, ${h.dayOfWeek}, ${h.openMin}, ${h.closeMin});`);
  }
  lines.push("COMMIT;");
  return lines.join("\n");
}

let rows;
if (arg("json")) rows = JSON.parse(readFileSync(arg("json"), "utf8"));
else {
  const els = await fetchOSM(arg("bbox", "26.05,-80.32,26.22,-80.08"));
  rows = normalize(els, arg("city", "Fort Lauderdale"), Number(arg("limit", "220")));
  console.error(`fetched ${els.length} OSM elements -> ${rows.length} businesses`);
  if (arg("out")) writeFileSync(arg("out"), JSON.stringify(rows, null, 1));
}
const byCat = {}; for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
console.error("by category:", byCat);

if (arg("sql")) { writeFileSync(arg("sql"), toSQL(rows)); console.error(`wrote ${arg("sql")}`); }
else if (process.env.DATABASE_URL) {
  const { PrismaClient } = await import("@prisma/client");
  const p = new PrismaClient(); let n = 0;
  for (const r of rows) {
    const { openingHours, ...data } = r;
    await p.business.upsert({ where: { slug: r.slug }, update: {}, create: { ...data, openingHours: { create: openingHours } } }); n++;
  }
  await p.$disconnect(); console.error(`upserted ${n}`);
}
