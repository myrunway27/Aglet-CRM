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

// ——— "Add to Google Calendar" links (WordPress event plugins emit these) ———
// The link's query string carries the event name, exact start datetime in the
// venue's timezone, and the event page URL. Data is the venue's own, verbatim.

function eventsFromGcalLinks(html, pageUrl) {
  const out = [];
  for (const m of html.matchAll(/href="(https:\/\/www\.google\.com\/calendar\/event\?[^"]+)"/g)) {
    let q;
    try { q = new URL(decodeEntities(m[1])).searchParams; } catch { continue; }
    const name = q.get("text");
    const dates = q.get("dates");
    if (!name || !dates || !/^\d{8}T\d{6}/.test(dates)) continue;
    const d = dates.split("/")[0];
    const sprop = q.getAll("sprop").find((s) => s.startsWith("http"));
    out.push({
      name: name.trim(),
      startDate: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}`,
      url: sprop || pageUrl,
      description: (q.get("details") || "").slice(0, 400) || null,
      offersUrl: null,
      method: "gcal-link",
    });
  }
  return out;
}

// ——— SeeTickets embedded listing (event-info-block markup) ———
// Listing shows "Fri Aug 14"-style dates without a year; the year is resolved
// by deterministic calendar math (next occurrence, tolerating ~45 days past).

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function resolveYear(mon, day, now) {
  const y = now.getFullYear();
  const cand = new Date(y, mon - 1, day);
  return cand < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 45) ? y + 1 : y;
}

function to24h(t) {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function eventsFromSeeTickets(html, pageUrl) {
  const out = [];
  const now = new Date();
  for (const block of html.split(/event-info-block/).slice(1)) {
    const chunk = block.slice(0, 3000);
    const date = chunk.match(/event-date"[^>]*>\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+([A-Z][a-z]{2})[a-z]*\.?\s+(\d{1,2})/);
    const title = chunk.match(/event-title"[^>]*>\s*<a\s+href=["']?([^"' >]+)["']?[^>]*>([\s\S]*?)<\/a>/);
    if (!date || !title || !MONTHS[date[1]]) continue;
    const mon = MONTHS[date[1]], day = Number(date[2]);
    const show = chunk.match(/see-showtime[^>]*>\s*([^<]+)</);
    const time = show ? to24h(show[1]) : null;
    out.push({
      name: decodeEntities(title[2].replace(/<[^>]+>/g, "")),
      startDate: `${resolveYear(mon, day, now)}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}${time ? `T${time}` : ""}`,
      url: new URL(decodeEntities(title[1]), pageUrl).href,
      description: null,
      offersUrl: null,
      method: "seetickets",
    });
  }
  return out;
}

// ——— Next.js __NEXT_DATA__ (TinaCMS-style event nodes) ———

function toEastern(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function eventsFromNextData(html, pageUrl) {
  const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  let data;
  try { data = JSON.parse(m[1]); } catch { return []; }
  const out = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node.title === "string" && Array.isArray(node.event_info)) {
      if (String(node.active_status).toLowerCase() === "false") return;
      for (const info of node.event_info) {
        if (!info?.event_date) continue;
        out.push({
          name: node.title.trim(),
          startDate: /Z$/.test(info.event_date) ? toEastern(info.event_date) : String(info.event_date),
          url: typeof info.ticket_link === "string" && info.ticket_link.startsWith("http") ? info.ticket_link : pageUrl,
          description: null,
          offersUrl: null,
          method: "next-data",
        });
      }
      return;
    }
    Object.values(node).forEach(walk);
  })(data);
  return out;
}

// ——— The Events Calendar (tribe) REST API ———
// Only queried when the page itself shows tribe-events markers; the endpoint
// is the plugin's standard public API on the venue's own domain.

async function eventsFromTribeApi(html, pageUrl) {
  if (!/tribe-events|The Events Calendar/i.test(html)) return [];
  const api = new URL("/wp-json/tribe/events/v1/events?per_page=50", pageUrl).href;
  let json;
  try { json = JSON.parse(await get(api)); } catch { return []; }
  return (json.events || []).map((e) => ({
    name: decodeEntities(String(e.title).replace(/<[^>]+>/g, "")),
    startDate: String(e.start_date || "").replace(" ", "T"),
    url: e.url || pageUrl,
    description: e.description ? decodeEntities(e.description.replace(/<[^>]+>/g, " ")).slice(0, 400) : null,
    offersUrl: typeof e.website === "string" && e.website.startsWith("http") ? e.website : null,
    method: "tribe-rest",
  })).filter((e) => e.name && /^\d{4}-\d{2}-\d{2}/.test(e.startDate));
}

function extractFromHtml(html, pageUrl) {
  for (const fn of [eventsFromJsonLd, eventsFromGcalLinks, eventsFromSeeTickets, eventsFromNextData]) {
    const events = fn(html, pageUrl);
    if (events.length) return events;
  }
  return [];
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
    let events = extractFromHtml(html, venue.calendarUrl);
    if (events.length === 0) events = await eventsFromTribeApi(html, venue.calendarUrl);
    if (events.length === 0) {
      const icsUrl = discoverIcsUrl(html, venue.calendarUrl);
      if (icsUrl) events = eventsFromIcs(await get(icsUrl), icsUrl);
    }
    if (events.length === 0) {
      // Follow the page's own event/calendar links (real links, never guessed)
      let i = 0;
      for (const link of eventPageLinks(html, venue.calendarUrl)) {
        try {
          const sub = await get(link);
          snapshot(venue.id, `link${++i}`, sub);
          events.push(...extractFromHtml(sub, link));
          if (events.length === 0) {
            const ics = discoverIcsUrl(sub, link);
            if (ics) events.push(...eventsFromIcs(await get(ics), ics));
          }
        } catch { /* dead link: skip */ }
        if (events.length > 0) break;
      }
    }
    const method = events[0]?.method ?? null;
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

const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith("--")));
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
