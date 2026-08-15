import React, { useMemo, useState } from "react";

/**
 * SFLA Tribute & Cover Band Tracker — Miami to Boca Raton
 *
 * DATA INTEGRITY POLICY (the rule this app lives by):
 *   Every show in SHOWS must be confirmed against the venue's official
 *   calendar or ticketing page. Each entry carries the source URL it was
 *   verified against and the date it was verified. No inferred shows, no
 *   placeholders, no "probably plays every Friday" entries. Ever.
 *
 * THIS BUILD (2026-08-15):
 *   Rebuilt in an environment whose network policy blocks direct access to
 *   venue calendars, so ZERO shows are pre-loaded. That is deliberate: an
 *   empty list is honest; an unverifiable list is not. The venue registry
 *   below is complete for the Miami-to-Boca corridor, and every venue links
 *   straight to its official calendar so shows can be verified and added.
 *
 * To add a verified show, append to SHOWS:
 *   {
 *     id: "fb-2026-08-22-petty",          // unique
 *     date: "2026-08-22",                  // YYYY-MM-DD
 *     band: "Free Fallin'",
 *     tributeTo: "Tom Petty",              // null for original/cover-mix acts
 *     venueId: "funky-biscuit",
 *     time: "8:00 PM",                     // null if not listed
 *     price: "$15",                        // null if not listed
 *     sourceUrl: "https://...",            // the page it was verified on — REQUIRED
 *     verifiedOn: "2026-08-15",            // REQUIRED
 *     warning: null,                       // or e.g. "Date listed on flyer only, not ticketing"
 *   }
 */

const BUILD = {
  date: "2026-08-15",
  note:
    "Rebuilt from scratch. No shows pre-loaded — venue calendars were unreachable " +
    "from the build environment, and this tracker does not ship unverified data.",
};

// Coverage statuses:
//   "full"    — official calendar fully checked through the horizon date
//   "partial" — some shows verified, calendar not exhaustively checked
//   "none"    — not audited; use the official calendar link directly
const VENUES = [
  // ——— Boca Raton ———
  { id: "funky-biscuit",    name: "Funky Biscuit",         city: "Boca Raton",      calendarUrl: "https://www.funkybiscuit.com/",               coverage: "none", lastChecked: null },
  { id: "crazy-uncle-mikes",name: "Crazy Uncle Mike's",    city: "Boca Raton",      calendarUrl: "https://www.crazyunclemikes.com/",            coverage: "none", lastChecked: null },
  { id: "boca-black-box",   name: "Boca Black Box",        city: "Boca Raton",      calendarUrl: "https://bocablackbox.com/",                   coverage: "none", lastChecked: null },
  { id: "barrel-of-monks",  name: "Barrel of Monks",       city: "Boca Raton",      calendarUrl: "https://barrelofmonks.com/",                  coverage: "none", lastChecked: null },
  // ——— Delray Beach ———
  { id: "tin-roof-delray",  name: "Tin Roof Delray Beach", city: "Delray Beach",    calendarUrl: "https://tinroofdelraybeach.com/calendar/",    coverage: "none", lastChecked: null },
  // ——— Fort Lauderdale / Oakland Park ———
  { id: "revolution-live",  name: "Revolution Live",       city: "Fort Lauderdale", calendarUrl: "https://www.jointherevolution.net/concerts/", coverage: "none", lastChecked: null },
  { id: "tin-roof-ftl",     name: "Tin Roof Ft Lauderdale",city: "Fort Lauderdale", calendarUrl: "https://tinroofftlauderdale.com/calendar/",   coverage: "none", lastChecked: null },
  { id: "tarpon-river",     name: "Tarpon River Brewing",  city: "Fort Lauderdale", calendarUrl: "https://tarponriverbrewing.com/",             coverage: "none", lastChecked: null },
  { id: "funky-buddha",     name: "Funky Buddha Brewery",  city: "Oakland Park",    calendarUrl: "https://funkybuddhabrewery.com/",             coverage: "none", lastChecked: null },
  // ——— Miami ———
  { id: "ball-and-chain",   name: "Ball & Chain",          city: "Miami",           calendarUrl: "https://ballandchainmiami.com/upcoming-events/", coverage: "none", lastChecked: null },
  { id: "lagniappe",        name: "Lagniappe",             city: "Miami",           calendarUrl: "https://lagniappehouse.com/",                 coverage: "none", lastChecked: null },
  { id: "churchills",       name: "Churchill's Pub",       city: "Miami",           calendarUrl: "https://churchillspub.com/",                  coverage: "none", lastChecked: null },
];

// Verified shows only. See the data integrity policy above.
const SHOWS = [];

// ————————————————————————————————————————————————————————————————

const COVERAGE_META = {
  full:    { label: "Fully checked", color: "#4ade80" },
  partial: { label: "Partially checked", color: "#fbbf24" },
  none:    { label: "Not audited", color: "#f87171" },
};

const CITIES = ["All", ...Array.from(new Set(VENUES.map((v) => v.city)))];

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TributeTracker() {
  const [city, setCity] = useState("All");
  const [tributeOnly, setTributeOnly] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);

  const venueById = useMemo(
    () => Object.fromEntries(VENUES.map((v) => [v.id, v])),
    []
  );

  const counts = useMemo(() => {
    const c = { full: 0, partial: 0, none: 0 };
    VENUES.forEach((v) => c[v.coverage]++);
    return c;
  }, []);

  const visibleShows = useMemo(() => {
    return SHOWS.filter((s) => {
      const venue = venueById[s.venueId];
      if (!venue) return false;
      if (city !== "All" && venue.city !== city) return false;
      if (tributeOnly && !s.tributeTo) return false;
      return true;
    }).sort((a, b) =>
      a.date === b.date
        ? (a.time || "").localeCompare(b.time || "")
        : a.date.localeCompare(b.date)
    );
  }, [city, tributeOnly, venueById]);

  const nights = useMemo(() => {
    const grouped = [];
    let current = null;
    visibleShows.forEach((s) => {
      if (!current || current.date !== s.date) {
        current = { date: s.date, shows: [] };
        grouped.push(current);
      }
      current.shows.push(s);
    });
    return grouped;
  }, [visibleShows]);

  const filteredVenues =
    city === "All" ? VENUES : VENUES.filter((v) => v.city === city);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>SFLA Tribute &amp; Cover Tracker</h1>
        <p style={styles.subtitle}>Miami → Boca Raton · verified shows only</p>
      </header>

      {/* Coverage-transparency banner */}
      <div style={styles.banner}>
        <div style={styles.bannerRow}>
          {Object.entries(COVERAGE_META).map(([key, meta]) => (
            <span key={key} style={styles.bannerStat}>
              <span style={{ ...styles.dot, background: meta.color }} />
              {counts[key]} {meta.label.toLowerCase()}
            </span>
          ))}
        </div>
        <p style={styles.bannerNote}>
          Every show listed here was confirmed on an official venue calendar or
          ticketing page, with a source link and verification date. Anything not
          listed may still be happening — check the venue calendars below.
        </p>
        <p style={styles.buildNote}>
          Build {BUILD.date}: {BUILD.note}
        </p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            style={{
              ...styles.chip,
              ...(city === c ? styles.chipActive : null),
            }}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setTributeOnly((t) => !t)}
          style={{
            ...styles.chip,
            ...(tributeOnly ? styles.chipActive : null),
          }}
        >
          Tribute acts only
        </button>
      </div>

      {/* Show list, grouped night by night */}
      {nights.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>No verified shows loaded.</p>
          <p style={styles.emptyBody}>
            This is not a claim that nothing is happening — it means nothing has
            been verified yet in this build. Tap a venue below to open its
            official calendar.
          </p>
        </div>
      ) : (
        nights.map((night) => (
          <section key={night.date}>
            <div style={styles.nightDivider}>
              <span style={styles.nightLabel}>{formatDate(night.date)}</span>
              <span style={styles.nightLine} />
            </div>
            {night.shows.map((s) => {
              const venue = venueById[s.venueId];
              return (
                <div key={s.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <span style={styles.band}>{s.band}</span>
                    {s.tributeTo && (
                      <span style={styles.tributeTag}>
                        tribute · {s.tributeTo}
                      </span>
                    )}
                  </div>
                  <div style={styles.cardMeta}>
                    <a
                      href={venue.calendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.venueLink}
                    >
                      {venue.name}
                    </a>
                    <span style={styles.metaDim}> · {venue.city}</span>
                    {s.time && <span style={styles.metaDim}> · {s.time}</span>}
                    {s.price && <span style={styles.metaDim}> · {s.price}</span>}
                  </div>
                  {s.warning && (
                    <div style={styles.warning}>⚠ {s.warning}</div>
                  )}
                  <div style={styles.verified}>
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.sourceLink}
                    >
                      source
                    </a>
                    <span style={styles.metaDim}>
                      {" "}
                      · verified {s.verifiedOn}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}

      {/* Per-venue coverage panel */}
      <div style={styles.coverageHeader}>
        <button
          onClick={() => setShowCoverage((s) => !s)}
          style={styles.coverageToggle}
        >
          Venue coverage ({filteredVenues.length}){" "}
          {showCoverage ? "▾" : "▸"}
        </button>
      </div>
      {showCoverage && (
        <div>
          {filteredVenues.map((v) => {
            const meta = COVERAGE_META[v.coverage];
            return (
              <div key={v.id} style={styles.venueRow}>
                <div>
                  <div style={styles.venueName}>{v.name}</div>
                  <div style={styles.metaDim}>
                    {v.city} ·{" "}
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    {v.lastChecked && ` · checked ${v.lastChecked}`}
                  </div>
                </div>
                <a
                  href={v.calendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.calBtn}
                >
                  Official calendar ↗
                </a>
              </div>
            );
          })}
        </div>
      )}

      <footer style={styles.footer}>
        Verified-only policy: no inferred or placeholder shows. If it's listed,
        it has a source link; if it doesn't, it doesn't belong here.
      </footer>
    </div>
  );
}

const styles = {
  app: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "24px 16px 48px",
    background: "#0f1117",
    color: "#e5e7eb",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
  header: { marginBottom: 16 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: "#fff" },
  subtitle: { margin: "4px 0 0", color: "#9ca3af", fontSize: 14 },
  banner: {
    background: "#1a1d27",
    border: "1px solid #2d3140",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 16,
  },
  bannerRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 },
  bannerStat: { fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  bannerNote: { margin: 0, fontSize: 12.5, color: "#9ca3af", lineHeight: 1.5 },
  buildNote: {
    margin: "8px 0 0",
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 1.5,
  },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  chip: {
    background: "#1a1d27",
    border: "1px solid #2d3140",
    color: "#d1d5db",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  chipActive: { background: "#4f46e5", borderColor: "#4f46e5", color: "#fff" },
  empty: {
    background: "#1a1d27",
    border: "1px dashed #3f4453",
    borderRadius: 10,
    padding: "28px 20px",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "#fff" },
  emptyBody: {
    margin: "8px auto 0",
    fontSize: 13.5,
    color: "#9ca3af",
    lineHeight: 1.6,
    maxWidth: 440,
  },
  nightDivider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "22px 0 10px",
  },
  nightLabel: { fontSize: 14, fontWeight: 700, color: "#a5b4fc", whiteSpace: "nowrap" },
  nightLine: { flex: 1, height: 1, background: "#2d3140" },
  card: {
    background: "#1a1d27",
    border: "1px solid #2d3140",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 8,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  band: { fontSize: 16, fontWeight: 600, color: "#fff" },
  tributeTag: {
    fontSize: 11.5,
    background: "#312e81",
    color: "#c7d2fe",
    borderRadius: 6,
    padding: "2px 8px",
  },
  cardMeta: { marginTop: 4, fontSize: 13.5 },
  venueLink: { color: "#a5b4fc", textDecoration: "none" },
  metaDim: { color: "#9ca3af", fontSize: 13 },
  warning: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#fbbf24",
    background: "rgba(251,191,36,.08)",
    borderRadius: 6,
    padding: "4px 8px",
  },
  verified: { marginTop: 6, fontSize: 12 },
  sourceLink: { color: "#4ade80", textDecoration: "none" },
  coverageHeader: { margin: "28px 0 10px" },
  coverageToggle: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  venueRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "#1a1d27",
    border: "1px solid #2d3140",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 8,
  },
  venueName: { fontSize: 14.5, fontWeight: 600, color: "#fff" },
  calBtn: {
    fontSize: 12.5,
    color: "#a5b4fc",
    textDecoration: "none",
    border: "1px solid #3f4453",
    borderRadius: 8,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  footer: {
    marginTop: 32,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.6,
    borderTop: "1px solid #2d3140",
    paddingTop: 14,
  },
};
