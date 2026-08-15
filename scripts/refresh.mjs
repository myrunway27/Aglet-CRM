#!/usr/bin/env node
/**
 * refresh.mjs — pulls real event data straight from each venue's own website
 * and writes data/shows.json. Deterministic: no AI, no inference, no
 * projection. A show appears only if the venue's page contains it; every show
 * keeps the URL it came from and the fetch timestamp. Venues that fail to
 * fetch or parse are recorded as errors, never guessed at.
 *
 * Strategy per venue (generic, works across ticketing platforms):
 *   1. Fetch the official calendar page.
 *   2. Parse schema.org Event/MusicEvent JSON-LD blocks (most venue sites
 *      emit these for SEO — the data is the venue's own listing, verbatim).
 *   3. Fallback: discover a linked .ics feed and parse VEVENTs.
 *
 * Usage: node scripts/refresh.mjs [venueId ...]   (no args = all venues)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "shows.json");
const TIMEOUT_MS = 20000;
const UA = "sfla-tribute-tracker/1.0 (personal show tracker; contact via repo)";

export const VENUES = [
  { id: "funky-biscuit",     name: "Funky Biscuit",          city: "Boca Raton",      calendarUrl: "https://www.funkybiscuit.com/" },
  { id: "crazy-uncle-mikes", name: "Crazy Uncle Mike's",     city: "Boca Raton",      calendarUrl: "https://www.crazyunclemikes.com/" },
  { id: "boca-black-box",    name: "Boca Black Box",         city: "Boca Raton",      calendarUrl: "https://bocablackbox.com/" },
  { id: "barrel-of-monks",   name: "Barrel of Monks",        city: "Boca Raton",      calendarUrl: "https://barrelofmonks.com/" },
  { id: "tin-roof-delray",   name: "Tin Roof Delray Beach",  city: "Delray Beach",    calendarUrl: "https://tinroofdelraybeach.com/calendar/" },
  { id: "revolution-live",   name: "Revolution Live",        city: "Fort Lauderdale", calendarUrl: "https://www.jointherevolution.net/concerts/" },
  { id: "tin-roof-ftl",      name: "Tin Roof Ft Lauderdale", city: "Fort Lauderdale", calendarUrl: "https://tinroofftlauderdale.com/calendar/" },
  { id: "tarpon-river",      name: "Tarpon River Brewing",   city: "Fort Lauderdale", calendarUrl: "https://tarponriverbrewing.com/" },
  { id: "funky-buddha",      name: "Funky Buddha Brewery",   city: "Oakland Park",    calendarUrl: "https://funkybuddhabrewery.com/" },
  { id: "ball-and-chain",    name: "Ball & Chain",           city: "Miami",           calendarUrl: "https://ballandchainmiami.com/upcoming-events/" },
  { id: "lagniappe",         name: "Lagniappe",              city: "Miami",           calendarUrl: "https://lagniappehouse.com/" },
  { id: "churchills",        name: "Churchill's Pub",        city: "Miami",           calendarUrl: "https://churchillspub.com/" },
];

// The listing text itself decides the tribute flag — a match is recorded with
// the exact phrase that triggered it, so the UI can show its evidence.
const TRIBUTE_RE = /\btribute(?:\s+to\s+[\w .&'-]+)?|celebrating the music of\s+[\w .&'-]+|\ba tribute\b/i;

async function get(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,text/calendar,application/json;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ——— JSON-LD (schema.org Event) extraction ———

function* jsonLdBlocks(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try { yield JSON.parse(m[1].trim()); } catch { /* malformed block: skip */ }
  }
}

function* flattenLd(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) yield* flattenLd(n); return; }
  yield node;
  if (node["@graph"]) yield* flattenLd(node["@graph"]);
}

const EVENT_TYPES = new Set(["Event", "MusicEvent", "TheaterEvent", "ComedyEvent", "Festival"]);

function isEvent(node) {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => EVENT_TYPES.has(x));
}

function text(v) {
  if (v == null) return null;
  if (typeof v === "string") return decodeEntities(v.trim()) || null;
  if (typeof v === "object") return text(v.name || v["@value"]);
  return String(v);
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
    .replace(/\s+/g, " ").trim();
}

function eventsFromJsonLd(html, pageUrl) {
  const out = [];
  for (const block of jsonLdBlocks(html)) {
    for (const node of flattenLd(block)) {
      if (!isEvent(node)) continue;
      const name = text(node.name);
      const start = node.startDate || null;
      if (!name || !start) continue;
      out.push({
        name,
        startDate: String(start),
        url: typeof node.url === "string" ? new URL(node.url, pageUrl).href : pageUrl,
        description: text(node.description),
        offersUrl: typeof node.offers?.url === "string" ? node.offers.url : null,
        method: "json-ld",
      });
    }
  }
  return out;
}

// ——— ICS fallback ———

function discoverIcsUrl(html, pageUrl) {
  const m =
    html.match(/href=["']([^"']+\.ics[^"']*)["']/i) ||
    html.match(/["'](webcal:\/\/[^"']+)["']/i);
  if (!m) return null;
  return new URL(m[1].replace(/^webcal:/, "https:"), pageUrl).href;
}

function eventsFromIcs(ics, sourceUrl) {
  const out = [];
  for (const block of ics.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0].replace(/\r?\n[ \t]/g, ""); // unfold
    const field = (k) => body.match(new RegExp(`^${k}[^:]*:(.*)$`, "m"))?.[1].trim();
    const name = field("SUMMARY");
    const dt = field("DTSTART");
    if (!name || !dt) continue;
    const iso = dt.length >= 8
      ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}${dt.length > 8 ? `T${dt.slice(9, 11)}:${dt.slice(11, 13)}` : ""}`
      : dt;
    out.push({ name: decodeEntities(name.replace(/\\,/g, ",")), startDate: iso, url: field("URL") || sourceUrl, description: null, offersUrl: null, method: "ics" });
  }
  return out;
}

// ——— same-site link discovery ———
// If the main page has no structured events, follow links THE PAGE ITSELF
// contains whose href/text suggests an events listing. Real links only —
// nothing is guessed.

const LINK_HINT = /event|calendar|show|concert|music|live|lineup|schedule/i;

function eventPageLinks(html, pageUrl, limit = 4) {
  const base = new URL(pageUrl);
  const seen = new Set();
  const out = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    let href;
    try { href = new URL(m[1], pageUrl); } catch { continue; }
    if (href.origin !== base.origin) continue;
    if (href.href === base.href || seen.has(href.href)) continue;
    if (/\.(ics|jpg|png|pdf|css|js)([?#]|$)/i.test(href.pathname)) continue;
    if (!LINK_HINT.test(href.pathname) && !LINK_HINT.test(m[2])) continue;
    seen.add(href.href);
    out.push(href.href);
    if (out.length >= limit) break;
  }
  return out;
}

// ——— per-venue pipeline ———

function normalize(raw, venue, fetchedAt) {
  const dateOnly = raw.startDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const timeMatch = raw.startDate.match(/T(\d{2}:\d{2})/);
  const hay = `${raw.name} ${raw.description || ""}`;
  const tribute = hay.match(TRIBUTE_RE);
  return {
    id: `${venue.id}-${dateOnly}-${raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    date: dateOnly,
    time: timeMatch ? timeMatch[1] : null,
    band: raw.name,
    venueId: venue.id,
    tributeEvidence: tribute ? tribute[0] : null, // exact phrase from the listing, or null
    sourceUrl: raw.offersUrl || raw.url,
    method: raw.method,
    fetchedAt,
  };
}

const DEBUG = process.argv.includes("--debug");
const DEBUG_DIR = join(ROOT, "data", "debug");

function snapshot(venueId, tag, content) {
  if (!DEBUG) return;
  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(join(DEBUG_DIR, `${venueId}${tag ? `-${tag}` : ""}.html`), content.slice(0, 400_000));
}

async function refreshVenue(venue) {
  const fetchedAt = new Date().toISOString();
  try {
    const html = await get(venue.calendarUrl);
    snapshot(venue.id, "", html);
    let events = eventsFromJsonLd(html, venue.calendarUrl);
    let method = "json-ld";
    if (events.length === 0) {
      const icsUrl = discoverIcsUrl(html, venue.calendarUrl);
      if (icsUrl) { events = eventsFromIcs(await get(icsUrl), icsUrl); method = "ics"; }
    }
    if (events.length === 0) {
      // Follow the page's own event/calendar links (real links, never guessed)
      let i = 0;
      for (const link of eventPageLinks(html, venue.calendarUrl)) {
        try {
          const sub = await get(link);
          snapshot(venue.id, `link${++i}`, sub);
          events.push(...eventsFromJsonLd(sub, link));
          if (events.length === 0) {
            const ics = discoverIcsUrl(sub, link);
            if (ics) { events.push(...eventsFromIcs(await get(ics), ics)); method = "ics"; }
          }
        } catch { /* dead link: skip */ }
        if (events.length > 0) break;
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set();
    const shows = events
      .map((e) => normalize(e, venue, fetchedAt))
      .filter((s) => s && s.date >= today && !seen.has(s.id) && seen.add(s.id))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      status: events.length ? "ok" : "no-structured-data",
      method: events.length ? method : null,
      fetchedAt,
      showCount: shows.length,
      error: events.length ? null : "Page fetched but no schema.org events or ICS feed found — check the calendar manually.",
      shows,
    };
  } catch (err) {
    return { status: "error", method: null, fetchedAt, showCount: 0, error: String(err.message || err), shows: [] };
  }
}

// ——— main ———

// `--test <url>` runs the full pipeline against one URL and prints the result
// without touching data/shows.json (for verifying the parser).
const testIdx = process.argv.indexOf("--test");
if (testIdx !== -1) {
  const url = process.argv[testIdx + 1];
  const r = await refreshVenue({ id: "test", name: "Test", city: "Test", calendarUrl: url });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.status === "ok" ? 0 : 1);
}

const only = new Set(process.argv.slice(2));
const targets = only.size ? VENUES.filter((v) => only.has(v.id)) : VENUES;

const results = await Promise.all(targets.map(async (v) => [v.id, await refreshVenue(v)]));
const byVenue = Object.fromEntries(results);

const out = {
  generatedAt: new Date().toISOString(),
  policy: "Data is copied verbatim from venue websites by this script. Nothing is inferred or projected.",
  venues: VENUES.map(({ id, name, city, calendarUrl }) => ({
    id, name, city, calendarUrl,
    ...(byVenue[id]
      ? { status: byVenue[id].status, method: byVenue[id].method, fetchedAt: byVenue[id].fetchedAt, showCount: byVenue[id].showCount, error: byVenue[id].error }
      : { status: "skipped", method: null, fetchedAt: null, showCount: 0, error: "Not included in this refresh run." }),
  })),
  shows: results.flatMap(([, r]) => r.shows).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

for (const [id, r] of results) {
  console.log(`${r.status === "ok" ? "✓" : "✗"} ${id}: ${r.status}${r.method ? ` (${r.method})` : ""} — ${r.showCount} upcoming shows${r.error ? ` — ${r.error}` : ""}`);
}
console.log(`\nWrote ${out.shows.length} shows to ${OUT}`);
