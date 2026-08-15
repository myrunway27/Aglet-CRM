import React, { useMemo, useState } from "react";
import data from "./data/shows.json";

/**
 * SFLA Tribute & Cover Tracker — Miami to Boca Raton.
 *
 * All data comes from data/shows.json, written by `node scripts/refresh.mjs`,
 * which copies listings verbatim from each venue's own website. This component
 * only displays; it never invents. A show's tribute tag appears only when the
 * venue's listing text literally contains the evidence phrase shown.
 * Refresh = re-run the script. Fetch failures render as failures.
 */

const STATUS = {
  ok: { label: "fetched", cls: "ok" },
  "no-structured-data": { label: "needs manual check", cls: "warn" },
  error: { label: "fetch failed", cls: "err" },
  skipped: { label: "skipped", cls: "warn" },
};

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};
const fmtStamp = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "never");

export default function TributeTracker() {
  const [city, setCity] = useState("All");
  const [tributeOnly, setTributeOnly] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const venueById = useMemo(() => Object.fromEntries(data.venues.map((v) => [v.id, v])), []);
  const cities = useMemo(() => ["All", ...new Set(data.venues.map((v) => v.city))], []);
  const okCount = data.venues.filter((v) => v.status === "ok").length;
  const failCount = data.venues.length - okCount;

  const nights = useMemo(() => {
    const shows = data.shows.filter((s) => {
      const v = venueById[s.venueId];
      return v && (city === "All" || v.city === city) && (!tributeOnly || s.tributeEvidence);
    });
    const grouped = [];
    for (const s of shows) {
      const last = grouped[grouped.length - 1];
      if (last && last.date === s.date) last.shows.push(s);
      else grouped.push({ date: s.date, shows: [s] });
    }
    return grouped;
  }, [city, tributeOnly, venueById]);

  const venues = city === "All" ? data.venues : data.venues.filter((v) => v.city === city);

  return (
    <div className="app">
      <style>{CSS}</style>
      <h1>SFLA Tribute &amp; Cover Tracker</h1>
      <p className="sub">Miami → Boca · data copied verbatim from venue sites · nothing inferred</p>

      <div className="banner">
        <b>{data.shows.length}</b> shows from <b>{okCount}</b> venues fetched OK
        {failCount > 0 && <> · <span className="err">{failCount} venues failed or need a manual check</span></>}
        <div className="dim">Last refresh: {fmtStamp(data.generatedAt)} · run <code>node scripts/refresh.mjs</code> to update</div>
      </div>

      <div className="chips">
        {cities.map((c) => (
          <button key={c} className={city === c ? "chip on" : "chip"} onClick={() => setCity(c)}>{c}</button>
        ))}
        <button className={tributeOnly ? "chip on" : "chip"} onClick={() => setTributeOnly((t) => !t)}>Tribute only</button>
      </div>

      {nights.length === 0 ? (
        <div className="empty">
          <b>No shows in the current data.</b>
          <p>
            {okCount === 0
              ? "Every venue fetch failed in the last refresh (statuses below) — this list is empty because no real data was retrievable, not because nothing is happening."
              : "No listings match the current filters."}
            {" "}Venue calendar links below always work.
          </p>
        </div>
      ) : (
        nights.map((n) => (
          <section key={n.date}>
            <div className="night"><span>{fmtDate(n.date)}</span><i /></div>
            {n.shows.map((s) => {
              const v = venueById[s.venueId];
              return (
                <div className="card" key={s.id}>
                  <div className="row">
                    <b>{s.band}</b>
                    {s.tributeEvidence && (
                      <span className="tag" title={`Listing text: “${s.tributeEvidence}”`}>
                        {s.tributeTo ? `tribute · ${s.tributeTo}` : "tribute (per listing)"}
                      </span>
                    )}
                  </div>
                  <div className="dim">
                    <a href={v.calendarUrl} target="_blank" rel="noreferrer">{v.name}</a> · {v.city}{s.time && ` · ${s.time}`}
                  </div>
                  <div className="src">
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer">source</a>
                    <span className="dim"> · fetched {fmtStamp(s.fetchedAt)} via {s.method}</span>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}

      <button className="toggle" onClick={() => setShowPanel((s) => !s)}>
        Venue fetch status ({venues.length}) {showPanel ? "▾" : "▸"}
      </button>
      {showPanel && venues.map((v) => {
        const st = STATUS[v.status] || STATUS.error;
        return (
          <div className="vrow" key={v.id}>
            <div>
              <b>{v.name}</b>
              <div className="dim">
                {v.city} · <span className={st.cls}>{st.label}</span>
                {v.status === "ok" && ` · ${v.showCount} shows · ${fmtStamp(v.fetchedAt)}`}
                {v.error && <span className="errnote"> — {v.error}</span>}
              </div>
            </div>
            <a className="cal" href={v.calendarUrl} target="_blank" rel="noreferrer">calendar ↗</a>
          </div>
        );
      })}

      <footer>{data.policy}</footer>
    </div>
  );
}

const CSS = `
.app{max-width:640px;margin:0 auto;padding:24px 16px 48px;background:#0f1117;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh}
.app h1{margin:0;font-size:24px;color:#fff}
.sub{margin:4px 0 16px;color:#9ca3af;font-size:13.5px}
.banner{background:#1a1d27;border:1px solid #2d3140;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13.5px;line-height:1.6}
.banner code{color:#a5b4fc}
.dim{color:#9ca3af;font-size:12.5px}
.ok{color:#4ade80}.warn{color:#fbbf24}.err{color:#f87171}
.errnote{color:#f87171;font-size:12px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.chip{background:#1a1d27;border:1px solid #2d3140;color:#d1d5db;border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer}
.chip.on{background:#4f46e5;border-color:#4f46e5;color:#fff}
.empty{background:#1a1d27;border:1px dashed #3f4453;border-radius:10px;padding:24px 20px;text-align:center;margin-bottom:24px;font-size:14px}
.empty p{color:#9ca3af;font-size:13px;line-height:1.6;max-width:460px;margin:8px auto 0}
.night{display:flex;align-items:center;gap:12px;margin:22px 0 10px}
.night span{font-size:14px;font-weight:700;color:#a5b4fc;white-space:nowrap}
.night i{flex:1;height:1px;background:#2d3140}
.card{background:#1a1d27;border:1px solid #2d3140;border-radius:10px;padding:12px 14px;margin-bottom:8px}
.card .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:15.5px;color:#fff}
.tag{font-size:11px;background:#312e81;color:#c7d2fe;border-radius:6px;padding:2px 8px;cursor:help}
.card a,.vrow a{color:#a5b4fc;text-decoration:none}
.src{margin-top:4px;font-size:12px}
.src a{color:#4ade80}
.toggle{background:none;border:none;color:#fff;font-size:15px;font-weight:700;cursor:pointer;padding:0;margin:28px 0 10px;display:block}
.vrow{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#1a1d27;border:1px solid #2d3140;border-radius:10px;padding:10px 14px;margin-bottom:8px;font-size:14px}
.cal{font-size:12.5px;border:1px solid #3f4453;border-radius:8px;padding:6px 10px;white-space:nowrap}
footer{margin-top:32px;font-size:12px;color:#6b7280;line-height:1.6;border-top:1px solid #2d3140;padding-top:14px}
`;
