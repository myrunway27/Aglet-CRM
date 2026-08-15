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
import { execFile, execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "shows.json");
const TIMEOUT_MS = 20000;
// Some venue sites refuse non-browser clients outright, so identify as a
// mainstream browser. We fetch each public calendar once a day — the same
// page any visitor loads.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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
  { id: "churchills",        name: "Churchill's Pub",        city: "Miami",           calendarUrl: "https://churchillspub.com/", altUrls: ["https://churchills.miami/"] },
  { id: "culture-room",      name: "Culture Room",           city: "Fort Lauderdale", calendarUrl: "https://www.cultureroom.net/" },
  { id: "the-parker",        name: "The Parker",             city: "Fort Lauderdale", calendarUrl: "https://www.parkerplayhouse.com/" },
  { id: "pompano-amp",       name: "Pompano Beach Amphitheater", city: "Pompano Beach", calendarUrl: "https://www.pompanobeacharts.org/" },
  { id: "arts-garage",       name: "Arts Garage",            city: "Delray Beach",    calendarUrl: "https://artsgarage.org/" },
  { id: "johnnie-browns",    name: "Johnnie Brown's",        city: "Delray Beach",    calendarUrl: "https://johnniebrowns.com/" },
  { id: "mathews-brewing",   name: "Mathews Brewing",        city: "Lake Worth",      calendarUrl: "https://mathewsbrewing.com/" },
  { id: "respectable-street",name: "Respectable Street",     city: "West Palm Beach", calendarUrl: "https://respectablestreet.com/" },
  { id: "guanabanas",        name: "Guanabanas",             city: "Jupiter",         calendarUrl: "https://www.guanabanas.com/" },
];

// The listing text itself decides the tribute flag — a match is recorded with
// the exact phrase that triggered it, so the UI can show its evidence, and the
// honored artist is pattern-matched out of that same text. Deterministic:
// if the listing doesn't name the artist, tributeTo stays null.
const TRIBUTE_RE = /\btribute(?:\s+to\s+[\w .&'-]+)?|celebrating the music of\s+[\w .&'-]+|\ba tribute\b/i;

const QUALIFIER_RE = /^(?:an?|the|ultimate|premier|premiere|original|official|authentic|greatest|live|first|longest|running|only|&|sensational|professional|acclaimed|legendary|renowned|award[- ]winning|world['’]?s|america['’]?s|florida['’]?s|south florida['’]?s|#?\s?1|no\.?\s?1|favou?rite)\s+/i;

function cleanTarget(s) {
  const t = s.replace(/\s+/g, " ").replace(/[.,;:!\s]+$/g, "").trim();
  return t.length >= 2 && t.length <= 45 && t.split(" ").length <= 6 ? t : null;
}

function deriveTribute(text) {
  // "tribute to X" / "celebrating the music of X"
  let m = text.match(/\b(?:a\s+)?(?:tribute\s+to|celebrating\s+the\s+music\s+of)\s+(?:the\s+music\s+of\s+)?["“']?(.{2,60}?)["”']?\s*(?:$|[.!?;()\[\]|—–]|\s+(?:w\/|with\s|feat\b|featuring\b|performing\b|playing\b|plus\s|at\s|--?\s))/i);
  if (m) return { evidence: m[0].replace(/[.!?;()\[\]|—–]\s*$/, "").trim(), target: cleanTarget(m[1]) };
  // "X Tribute (Band|Experience|Show|Night)" — the words before "tribute",
  // with marketing qualifiers ("The Ultimate", "America's #1") stripped
  m = text.match(/([A-Za-z0-9][\w.'’&!\s]{1,45}?)\s+tribute(?:\s+(?:band|experience|show|night|act))?\b/i);
  if (m) {
    let t = m[1], prev;
    do { prev = t; t = t.replace(QUALIFIER_RE, ""); } while (t !== prev);
    return { evidence: m[0].trim(), target: cleanTarget(t) };
  }
  m = text.match(TRIBUTE_RE);
  return m ? { evidence: m[0].trim(), target: null } : null;
}

async function get(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,text/calendar,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message;
    throw new Error(cause ? `${err.message} (${cause})` : err.message);
  }
}

// Retry the venue's landing page with the www./naked host variant — a common
// cause of hard connection failures on small-venue DNS setups.
async function getWithHostRetry(url) {
  try {
    return { html: await get(url), url };
  } catch (err) {
    const u = new URL(url);
    u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    try {
      return { html: await get(u.href), url: u.href };
    } catch {
      throw err; // report the original host's error
    }
  }
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

// ——— "event-date" markup (Carbonhouse and similar venue platforms) ———
// Blocks shaped like: <div class="m-event-date">Sep 12, 2026</div> ...
// <h3><a href="/events/detail/x">Show Name</a></h3>

const MONTH_FULL = { January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12 };

function eventsFromEventDateMarkup(html, pageUrl) {
  const out = [];
  const re = /class="[^"]*event-date[^"]*"[^>]*>\s*([A-Z][a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})[\s\S]{0,600}?<h[23][^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const mon = MONTH_FULL[m[1]] || MONTHS[m[1].slice(0, 3)];
    if (!mon) continue;
    out.push({
      name: decodeEntities(m[5].replace(/<[^>]+>/g, "")),
      startDate: `${m[3]}-${String(mon).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`,
      url: new URL(decodeEntities(m[4]), pageUrl).href,
      description: null,
      offersUrl: null,
      method: "event-date-markup",
    });
  }
  return out;
}

function extractFromHtml(html, pageUrl) {
  for (const fn of [eventsFromJsonLd, eventsFromGcalLinks, eventsFromSeeTickets, eventsFromNextData, eventsFromEventDateMarkup]) {
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

// ——— headless Chrome fallback ———
// For calendars rendered by JavaScript and for hosts that reject non-browser
// TLS stacks. Chrome loads the page like any visitor; we then run the same
// extractors over the rendered DOM. Still deterministic — still the venue's
// own published data.

let chromeBin;
function findChrome() {
  if (chromeBin !== undefined) return chromeBin;
  for (const bin of ["google-chrome", "google-chrome-stable", "chromium-browser", "chromium"]) {
    try { execFileSync(bin, ["--version"], { stdio: "pipe" }); return (chromeBin = bin); } catch { /* next */ }
  }
  return (chromeBin = null);
}

// Chrome runs asynchronously (never blocking other venues' fetches) and one
// at a time via a queue, so a dozen fallbacks don't spawn a dozen browsers.
let chromeQueue = Promise.resolve();
function chromeDump(url) {
  const bin = findChrome();
  if (!bin) return Promise.resolve(null);
  const run = () => new Promise((resolve) => {
    execFile(bin, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--user-agent=${UA}`, "--virtual-time-budget=15000", "--dump-dom", url,
    ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 45000 },
    (err, stdout) => resolve(stdout && stdout.length > 500 ? stdout : null));
  });
  const p = chromeQueue.then(run, run);
  chromeQueue = p.then(() => {}, () => {});
  return p;
}

// ——— per-venue pipeline ———

function normalize(raw, venue, fetchedAt) {
  const dateOnly = raw.startDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const timeMatch = raw.startDate.match(/T(\d{2}:\d{2})/);
  // Name first; the description only if the name itself names no tribute —
  // keeps long description prose from polluting the captured artist.
  const tribute = deriveTribute(raw.name) || (raw.description ? deriveTribute(raw.description) : null);
  return {
    id: `${venue.id}-${dateOnly}-${raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    date: dateOnly,
    time: timeMatch ? timeMatch[1] : null,
    band: raw.name,
    venueId: venue.id,
    tributeEvidence: tribute ? tribute.evidence : null, // exact phrase from the listing, or null
    tributeTo: tribute ? tribute.target : null,         // artist named in that phrase, or null
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

async function harvestUrl(venue, pageUrl, snapTag) {
  const { html, url } = await getWithHostRetry(pageUrl);
  snapshot(venue.id, snapTag, html);
  let events = extractFromHtml(html, url);
  if (events.length === 0) events = await eventsFromTribeApi(html, url);
  if (events.length === 0) {
    const icsUrl = discoverIcsUrl(html, url);
    if (icsUrl) events = eventsFromIcs(await get(icsUrl), icsUrl);
  }
  if (events.length === 0) {
    // Follow the page's own event/calendar links (real links, never guessed)
    let i = 0;
    for (const link of eventPageLinks(html, url)) {
      try {
        const sub = await get(link);
        snapshot(venue.id, `${snapTag}link${++i}`, sub);
        events.push(...extractFromHtml(sub, link));
        if (events.length === 0) {
          const ics = discoverIcsUrl(sub, link);
          if (ics) events.push(...eventsFromIcs(await get(ics), ics));
        }
        if (events.length === 0) events.push(...await harvestEventIndex(sub, link));
      } catch { /* dead link: skip */ }
      if (events.length > 0) break;
    }
  }
  if (events.length === 0) events = await harvestEventIndex(html, url);
  return events;
}

// An index page dense with /events/<slug> links (city CMS sites): fetch each
// event's own page — up to 20 — and extract from it.
async function harvestEventIndex(html, pageUrl) {
  const base = new URL(pageUrl);
  const slugs = new Set();
  for (const m of html.matchAll(/href="([^"']*\/events?\/[a-z0-9][a-z0-9-]+\/?)"/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]), pageUrl);
      if (u.origin === base.origin && !/photo|gallery|category|tag|page/.test(u.pathname)) slugs.add(u.href);
    } catch { /* bad href */ }
  }
  if (slugs.size < 5) return [];
  const out = [];
  await Promise.all([...slugs].slice(0, 20).map(async (link) => {
    try { out.push(...extractFromHtml(await get(link), link)); } catch { /* skip */ }
  }));
  return out;
}

async function refreshVenue(venue) {
  const fetchedAt = new Date().toISOString();
  const urls = [venue.calendarUrl, ...(venue.altUrls || [])];
  try {
    let events = [];
    let fetchedAny = false;
    let lastErr = null;
    for (let u = 0; u < urls.length && events.length === 0; u++) {
      try {
        events = await harvestUrl(venue, urls[u], u ? `alt${u}-` : "");
        fetchedAny = true;
      } catch (err) { lastErr = err; }
    }
    if (events.length === 0) {
      for (let u = 0; u < urls.length && events.length === 0 && findChrome(); u++) {
        const dom = await chromeDump(urls[u]);
        if (!dom) continue;
        snapshot(venue.id, u ? `chrome-alt${u}` : "chrome", dom);
        fetchedAny = true;
        events = extractFromHtml(dom, urls[u]);
        if (events.length === 0) events = await eventsFromTribeApi(dom, urls[u]).catch(() => []);
        if (events.length > 0) events = events.map((e) => ({ ...e, method: `${e.method}+chrome` }));
      }
    }
    if (!fetchedAny && lastErr) throw lastErr;
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

// A stalled socket can let Node's event loop drain mid-run (AbortSignal
// timers don't hold the process open), which kills the script with an
// "unsettled top-level await". Hold the loop open for the whole run and cap
// each venue with a hard watchdog so one bad host can't sink the rest.
const keepAlive = setInterval(() => {}, 30_000);
const VENUE_BUDGET_MS = 600_000; // generous: includes waiting in the Chrome queue
function withWatchdog(promise, venue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, VENUE_BUDGET_MS, {
      status: "error", method: null, fetchedAt: new Date().toISOString(),
      showCount: 0, error: `no response within ${VENUE_BUDGET_MS / 1000}s`, shows: [],
    })),
  ]);
}

const results = await Promise.all(targets.map(async (v) => [v.id, await withWatchdog(refreshVenue(v), v)]));
clearInterval(keepAlive);
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
