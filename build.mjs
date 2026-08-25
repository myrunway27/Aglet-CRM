/**
 * Renders the Infinity Development site from content.json.
 *
 *   node build.mjs
 *
 * Outputs:
 *   dist/index.html        deployable static site
 *   dist/assets/styles.css
 *   preview.html           single-file build, for publishing as an Artifact
 *
 * All copy lives in content.json. Design tokens are the :root block at the
 * top of assets/styles.css. Nothing in this file needs editing to change
 * wording, services, or branding.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const c = JSON.parse(readFileSync(resolve(ROOT, "content.json"), "utf8"));
const css = readFileSync(resolve(ROOT, "assets/styles.css"), "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">';

/* Two interlocking rings — the infinity mark. */
const MARK = `<svg class="brand__mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <circle cx="11.5" cy="16" r="6.6" stroke="currentColor" stroke-width="2.4"/>
  <circle cx="20.5" cy="16" r="6.6" stroke="currentColor" stroke-width="2.4" opacity=".5"/>
</svg>`;

const ICONS = {
  code:   '<path d="M9 7 3.5 12.5 9 18M15 7l5.5 5.5L15 18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  cloud:  '<path d="M7.2 18.5A4.2 4.2 0 0 1 7 10.1a5.6 5.6 0 0 1 10.8-1.3 3.9 3.9 0 0 1-.6 9.7z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
  ai:     '<rect x="5" y="5" width="14" height="14" rx="3.5" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M12 2.4V5M12 19v2.6M2.4 12H5M19 12h2.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  web:    '<circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M3.6 12h16.8M12 3.6c2.4 2.5 3.6 5.4 3.6 8.4s-1.2 5.9-3.6 8.4c-2.4-2.5-3.6-5.4-3.6-8.4s1.2-5.9 3.6-8.4Z" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  design: '<path d="M12 3.2 4.4 8v8L12 20.8 19.6 16V8z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M4.4 8 12 12.6 19.6 8M12 12.6v8.2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  iot:    '<circle cx="12" cy="12" r="2.6" fill="currentColor"/><circle cx="5" cy="5.6" r="2.1" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="19" cy="5.6" r="2.1" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="5" cy="18.4" r="2.1" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="19" cy="18.4" r="2.1" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="m6.6 7 3.6 3.4M17.4 7l-3.6 3.4M6.6 17l3.6-3.4M17.4 17l-3.6-3.4" stroke="currentColor" stroke-width="1.4"/>',
  brand:  '<path d="M12 3.4 14.5 9l6.1.5-4.6 4 1.4 6-5.4-3.2L6.6 19.5l1.4-6-4.6-4L9.5 9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
};
const icon = (n) => `<svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.code}</svg>`;
const TICK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 4.5 6.5 12 2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* A true lemniscate: both lobes meet at centre with crossing tangents. */
const LEMNISCATE =
  "M120 60C133 41 149 30 168 30C191 30 210 43 210 60C210 77 191 90 168 90" +
  "C149 90 133 79 120 60C107 41 91 30 72 30C49 30 30 43 30 60C30 77 49 90 72 90" +
  "C91 90 107 79 120 60Z";

/* ------------------------------------------------------------- sections -- */

const header = () => `
<header class="masthead">
  <div class="wrap">
    <a class="brand" href="#top">${MARK}<span class="brand__name">Infinity <span>Development</span></span></a>
    <nav class="nav" aria-label="Primary">
      ${c.nav.map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("\n      ")}
    </nav>
    <span class="masthead__cta"><a class="btn btn--primary" href="#contact">Start a project</a></span>
  </div>
</header>`;

const hero = () => `
<section class="hero" id="top">
  <div class="wrap">
    <div class="hero__grid">
      <div>
        <p class="kicker">${esc(c.hero.kicker)}</p>
        <h1>${esc(c.hero.headline)}</h1>
        <p class="lede hero__lede">${esc(c.hero.lede)}</p>
        <div class="btns">
          <a class="btn btn--primary btn--lg" href="${esc(c.hero.primaryCta.href)}">${esc(c.hero.primaryCta.label)}</a>
          <a class="btn btn--ghost btn--lg" href="${esc(c.hero.secondaryCta.href)}">${esc(c.hero.secondaryCta.label)}</a>
        </div>
      </div>
      <svg class="loop" viewBox="0 0 240 120" aria-hidden="true">
        <path class="loop__track" d="${LEMNISCATE}"/>
        <path class="loop__run"  d="${LEMNISCATE}" pathLength="700"/>
        <path class="loop__run2" d="${LEMNISCATE}" pathLength="700"/>
      </svg>
    </div>
    <div class="marks">
      ${c.hero.marks.map((m) => `<span>${esc(m)}</span>`).join("\n      ")}
    </div>
  </div>
</section>`;

const about = () => `
<section class="section" id="about">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="kicker">${esc(c.about.kicker)}</p>
        <h2>${esc(c.about.headline)}</h2>
        ${c.about.body.map((p) => `<p class="lede">${esc(p)}</p>`).join("\n        ")}
      </div>
      <ul class="ticks">
        ${c.about.points
          .map((p) => `<li>${TICK}<div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div></li>`)
          .join("\n        ")}
      </ul>
    </div>
  </div>
</section>`;

const services = () => `
<section class="section section--line" id="services">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.services.kicker)}</p>
      <h2>${esc(c.services.headline)}</h2>
      <p class="lede">${esc(c.services.lede)}</p>
    </div>
    <div class="grid grid--auto">
      ${c.services.items
        .map(
          (s) => `<article class="card">
        <div class="card__icon">${icon(s.icon)}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </article>`
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;

const approach = () => `
<section class="section section--line" id="approach">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.approach.kicker)}</p>
      <h2>${esc(c.approach.headline)}</h2>
    </div>
    <ol class="steps">
      ${c.approach.steps
        .map(
          (s, i) => `<li class="step">
        <span class="step__n">${String(i + 1).padStart(2, "0")}</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.body)}</p>
      </li>`
        )
        .join("\n      ")}
    </ol>
  </div>
</section>`;

const capabilities = () => `
<section class="section section--line">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.capabilities.kicker)}</p>
      <h2>${esc(c.capabilities.headline)}</h2>
    </div>
    <div class="caps">
      ${c.capabilities.groups
        .map(
          (g) => `<div class="cap">
        <p class="cap__label">${esc(g.label)}</p>
        <ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="note" style="margin-top:1.6rem"><b>Note —</b> ${esc(c.capabilities.note)}</div>
  </div>
</section>`;

const work = () => `
<section class="section section--line work" id="work">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.work.kicker)}</p>
      <h2>${esc(c.work.headline)}</h2>
    </div>
    <div class="grid grid--3">
      ${c.work.items
        .map(
          (w) => `<article class="card">
        <div class="work__thumb"></div>
        <span class="work__tag">${esc(w.tag)}</span>
        <h3>${esc(w.title)}</h3>
        <p>${esc(w.body)}</p>
      </article>`
        )
        .join("\n      ")}
    </div>
    <div class="note" style="margin-top:1.6rem"><b>Note —</b> ${esc(c.work.note)}</div>
  </div>
</section>`;

const cta = () => `
<section class="section cta" id="contact">
  <div class="wrap">
    <p class="kicker">${esc(c.cta.kicker)}</p>
    <h2>${esc(c.cta.headline)}</h2>
    <p class="lede">${esc(c.cta.body)}</p>
    <div class="btns">
      <a class="btn btn--primary btn--lg mail" href="mailto:${esc(c.brand.email)}">${esc(c.cta.buttonLabel)}</a>
    </div>
  </div>
</section>`;

const footer = () => `
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="#top">${MARK}<span class="brand__name">Infinity <span>Development</span></span></a>
        <p>${esc(c.footer.blurb)}</p>
        <a class="footer__mail" href="mailto:${esc(c.brand.email)}">${esc(c.brand.email)}</a>
      </div>
      ${c.footer.columns
        .map(
          (col) => `<div>
        <h4>${esc(col.title)}</h4>
        <ul>${col.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="footer__base">
      <span>${esc(c.footer.copyright)}</span>
      <span class="sp">${esc(c.brand.domain)}</span>
    </div>
  </div>
</footer>`;

const schema = () =>
  `<script type="application/ld+json">\n${JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: c.brand.name,
      alternateName: c.brand.abbr,
      description: c.meta.description,
      url: c.meta.url,
      email: c.brand.email,
      foundingDate: c.brand.founded,
      knowsAbout: c.services.items.map((s) => s.title),
    },
    null,
    2
  )}\n</script>`;

const BODY = [
  header(),
  '<main id="main">',
  hero(),
  about(),
  services(),
  approach(),
  capabilities(),
  work(),
  cta(),
  "</main>",
  footer(),
].join("\n");

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
<link rel="canonical" href="${esc(c.meta.url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.meta.title)}">
<meta property="og:description" content="${esc(c.meta.description)}">
<meta property="og:url" content="${esc(c.meta.url)}">
<meta name="theme-color" content="#0A0E17">
${FONTS}
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${BODY}
${schema()}
</body>
</html>
`;

mkdirSync(resolve(ROOT, "dist/assets"), { recursive: true });
writeFileSync(resolve(ROOT, "dist/index.html"), page);
copyFileSync(resolve(ROOT, "assets/styles.css"), resolve(ROOT, "dist/assets/styles.css"));
writeFileSync(resolve(ROOT, "preview.html"), `<title>${esc(c.brand.name)}</title>\n${FONTS}\n<style>\n${css}\n</style>\n${BODY}\n`);

console.log("dist/index.html  " + page.length.toLocaleString() + " bytes");
console.log("preview.html     built");
