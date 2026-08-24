/**
 * Flattens the multi-page site into one self-contained file for phone review.
 * Run: node scripts/build-preview.mjs   ->   preview.html
 *
 * Output is written WITHOUT doctype/html/head/body wrappers so it can be
 * published directly as a Claude Artifact.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

const PAGES = [
  { id: "pv-home",     label: "Home",          file: "site/index.html" },
  { id: "pv-kitchens", label: "Kitchens",      file: "site/services/custom-kitchens.html" },
  { id: "pv-pricing",  label: "Pricing",       file: "site/pricing.html" },
  { id: "pv-gables",   label: "Coral Gables",  file: "site/locations/coral-gables.html" },
];

/* Longest patterns first — "../index.html#book" must win over "index.html". */
const LINKMAP = [
  ["../services/custom-kitchens.html", "#pv-kitchens"],
  ["services/custom-kitchens.html",    "#pv-kitchens"],
  ["../locations/coral-gables.html",   "#pv-gables"],
  ["locations/coral-gables.html",      "#pv-gables"],
  ["../pricing.html",                  "#pv-pricing"],
  ["pricing.html",                     "#pv-pricing"],
  ["../index.html",                    "#pv-home"],
  ["index.html",                       "#pv-home"],
];

const bodyOf = (html) => {
  const a = html.indexOf("<body>");
  const b = html.lastIndexOf("</body>");
  return html.slice(a + 6, b);
};

const spriteOf = (html) => {
  const a = html.indexOf('<svg width="0" height="0"');
  const b = html.indexOf("</svg>", html.indexOf("</defs>")) + 6;
  return html.slice(a, b);
};

let sprite = "";
const sections = PAGES.map((p, i) => {
  const raw = read(p.file);
  if (i === 0) sprite = spriteOf(raw);

  let body = bodyOf(raw)
    .replace(/<a class="skip"[\s\S]*?<\/a>/g, "")
    .replace(/<svg width="0" height="0"[\s\S]*?<\/defs>\s*<\/svg>/g, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  /* Rewrite cross-page links onto the switcher, keeping in-page anchors. */
  for (const [from, to] of LINKMAP) {
    body = body.split(`href="${from}#`).join(`href="${to}" data-anchor="`);
    body = body.split(`href="${from}"`).join(`href="${to}"`);
  }
  body = body.replace(/ data-anchor="([a-z-]+)"/g, ' data-anchor="$1"');

  return `<section class="pv-page" id="${p.id}"${i === 0 ? "" : " hidden"}>\n${body.trim()}\n</section>`;
});

const css = read("site/assets/styles.css");

const out = `<title>Delta Woodworks Redesign</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<style>
${css}

/* ---------------------------------------------------- preview chrome --- */
body { padding-bottom: 78px; }

.pv-banner {
  background: var(--band);
  color: var(--band-muted);
  border-bottom: 1px solid var(--band-line);
  font-family: var(--font-body);
  font-size: .82rem;
  line-height: 1.5;
  padding: .8rem 0;
}
.pv-banner .wrap { display: flex; gap: .7rem; align-items: flex-start; }
.pv-banner b { color: var(--accent-2); font-weight: 600; }

.pv-switch {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 90;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: saturate(160%) blur(14px);
  border-top: 1px solid var(--border);
  padding: .55rem 0 calc(.55rem + env(safe-area-inset-bottom, 0px));
}
.pv-switch__inner {
  display: flex;
  gap: .4rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding-inline: 14px;
  max-width: var(--wrap);
  margin-inline: auto;
}
.pv-switch__inner::-webkit-scrollbar { display: none; }
.pv-switch button {
  flex: none;
  font-family: var(--font-body);
  font-size: .85rem;
  font-weight: 600;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: .5rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color .16s ease, color .16s ease, border-color .16s ease;
}
.pv-switch button:hover { border-color: var(--accent-2); color: var(--text); }
.pv-switch button[aria-selected="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}
.pv-switch__tag {
  flex: none;
  align-self: center;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--text-3);
  padding-right: .5rem;
  border-right: 1px solid var(--border);
  margin-right: .3rem;
}
@media (max-width: 560px) { .pv-switch__tag { display: none; } }
</style>

${sprite}

<div class="pv-banner">
  <div class="wrap">
    <span aria-hidden="true">◆</span>
    <span><b>Design mockup.</b> Photography is placeholder — each frame carries the shot it needs. Pricing ranges are market-derived placeholders to be replaced with Delta's real numbers. Everything else is production-ready copy and markup.</span>
  </div>
</div>

${sections.join("\n\n")}

<nav class="pv-switch" aria-label="Preview pages">
  <div class="pv-switch__inner" role="tablist">
    <span class="pv-switch__tag">Pages</span>
${PAGES.map((p, i) => `    <button role="tab" data-target="${p.id}" aria-selected="${i === 0}">${p.label}</button>`).join("\n")}
  </div>
</nav>

<script>
(function () {
  var pages = ${JSON.stringify(PAGES.map((p) => p.id))};
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".pv-switch button"));

  function show(id, anchor) {
    if (pages.indexOf(id) < 0) return;
    pages.forEach(function (p) {
      var el = document.getElementById(p);
      if (el) el.hidden = p !== id;
    });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.target === id)); });
    if (anchor) {
      var target = document.getElementById(anchor);
      if (target) { target.scrollIntoView({ behavior: "auto", block: "start" }); return; }
    }
    window.scrollTo(0, 0);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.dataset.target); });
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='#pv-']");
    if (!a) return;
    e.preventDefault();
    show(a.getAttribute("href").slice(1), a.dataset.anchor);
  });
})();
</script>
`;

writeFileSync(resolve(ROOT, "preview.html"), out);
console.log("built preview.html (" + out.length.toLocaleString() + " bytes, " + PAGES.length + " pages)");
