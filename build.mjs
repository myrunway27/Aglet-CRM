/**
 * Renders the marketing site from content.json.
 *
 *   node build.mjs
 *
 * Outputs:
 *   dist/index.html        deployable static site
 *   dist/assets/styles.css
 *   preview.html           single-file version for publishing as an Artifact
 *
 * All copy comes from content.json. To retarget this site at a different
 * product or industry, rewrite content.json — nothing here needs editing.
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
  '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">';

const MARK = `<svg class="brand__mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect x="1.3" y="1.3" width="21.4" height="21.4" rx="5.2" stroke="currentColor" stroke-width="1.5" opacity=".4"/>
  <path d="M6.8 17.4 13.4 9.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M13.1 10.4 15.9 6.9a1.4 1.4 0 0 1 2.1 2.5l-3.1 3.2z" fill="currentColor"/>
</svg>`;

const CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 4.5 6.5 12 2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* --------------------------------------------------------------- blocks -- */

const header = () => `
<header class="masthead">
  <div class="wrap">
    <a class="brand" href="#top">${MARK}<span class="brand__name">${esc(c.brand.name)}</span></a>
    <nav class="nav" aria-label="Primary">
      ${c.nav.map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("\n      ")}
    </nav>
    <span class="masthead__cta">
      <a class="btn btn--primary" href="${esc(c.hero.primaryCta.href)}">Start free trial</a>
    </span>
  </div>
</header>`;

const hero = () => `
<section class="hero" id="top">
  <div class="wrap">
    <div class="hero__inner">
      <p class="kicker">${esc(c.hero.kicker)}</p>
      <h1>${esc(c.hero.headline)}</h1>
      <p class="lede hero__lede">${esc(c.hero.lede)}</p>
      <div class="btns">
        <a class="btn btn--primary btn--lg" href="${esc(c.hero.primaryCta.href)}">${esc(c.hero.primaryCta.label)}</a>
        <a class="btn btn--ghost btn--lg" href="${esc(c.hero.secondaryCta.href)}">${esc(c.hero.secondaryCta.label)}</a>
      </div>
      <p class="hero__note">${esc(c.hero.note)}</p>
    </div>
  </div>
  <div class="wrap board">
    <p class="board__bar"><span class="board__dot"></span> ${esc(c.pipeline.caption)}</p>
    <div class="board__scroll">
      <div class="board__cols">
        ${c.pipeline.stages
          .map(
            (s) => `<div class="col">
          <div class="col__head"><span>${esc(s.name)}</span><span class="col__count">${s.jobs.length}</span></div>
          <div class="col__list">
            ${s.jobs
              .map(
                (j) => `<article class="jobcard">
              <div class="jobcard__id">${esc(j.id)}</div>
              <div class="jobcard__client">${esc(j.client)}</div>
              <div class="jobcard__detail">${esc(j.detail)}</div>
              <div class="jobcard__foot"><span class="chip">${esc(j.due)}</span>${
                  j.flag ? `<span class="chip chip--flag">${esc(j.flag)}</span>` : ""
                }</div>
            </article>`
              )
              .join("\n            ")}
          </div>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>
  </div>
</section>`;

const problem = () => `
<section class="section band">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.problem.kicker)}</p>
      <h2>${esc(c.problem.headline)}</h2>
      <p class="lede">${esc(c.problem.body)}</p>
    </div>
    <div class="grid grid--3">
      ${c.problem.points
        .map((p) => `<div class="card"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`)
        .join("\n      ")}
    </div>
  </div>
</section>`;

const how = () => `
<section class="section" id="how">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.how.kicker)}</p>
      <h2>${esc(c.how.headline)}</h2>
    </div>
    <ol class="steps">
      ${c.how.steps
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

const features = () => `
<section class="section" id="features" style="background:var(--surface-2);border-block:1px solid var(--border)">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.features.kicker)}</p>
      <h2>${esc(c.features.headline)}</h2>
    </div>
    <div class="grid grid--3">
      ${c.features.items
        .map((f) => `<div class="card"><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></div>`)
        .join("\n      ")}
    </div>
  </div>
</section>`;

const compare = () => `
<section class="section" id="compare">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.compare.kicker)}</p>
      <h2>${esc(c.compare.headline)}</h2>
    </div>
    <div class="compare">
      <div class="compare__scroll">
        <table>
          <caption class="vh">How shops run jobs today, compared with ${esc(c.brand.name)}</caption>
          <thead>
            <tr><th scope="col">&nbsp;</th>${c.compare.columns.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${c.compare.rows
              .map(
                (r) =>
                  `<tr><th scope="row">${esc(r.label)}</th>${r.values.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`
              )
              .join("\n            ")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="note" style="margin-top:1.2rem"><b>Note —</b> ${esc(c.compare.note)}</div>
  </div>
</section>`;

const testimonial = () => `
<section class="section band">
  <div class="wrap wrap--narrow">
    <figure class="pull">
      <blockquote>${esc(c.testimonial.quote)}</blockquote>
      <figcaption>${esc(c.testimonial.attribution)}</figcaption>
    </figure>
  </div>
</section>`;

const pricing = () => `
<section class="section" id="pricing">
  <div class="wrap">
    <div class="s-head">
      <p class="kicker">${esc(c.pricing.kicker)}</p>
      <h2>${esc(c.pricing.headline)}</h2>
    </div>
    <div class="tiers">
      ${c.pricing.tiers
        .map(
          (t) => `<div class="tier${t.featured ? " tier--featured" : ""}">
        ${t.featured ? '<span class="tier__flag">Most shops</span>' : ""}
        <div class="tier__name">${esc(t.name)}</div>
        <p class="tier__blurb">${esc(t.blurb)}</p>
        <div class="tier__price">${esc(t.price)}</div>
        <div class="tier__unit">${esc(t.unit)}</div>
        <ul>
          ${t.features.map((f) => `<li>${CHECK}<span>${esc(f)}</span></li>`).join("\n          ")}
        </ul>
        <a class="btn ${t.featured ? "btn--primary" : "btn--ghost"} btn--block" href="#pricing">${esc(t.cta)}</a>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="note" style="margin-top:1.2rem"><b>Note —</b> ${esc(c.pricing.note)}</div>
  </div>
</section>`;

const faq = () => `
<section class="section" id="faq" style="background:var(--surface-2);border-block:1px solid var(--border)">
  <div class="wrap wrap--narrow">
    <div class="s-head">
      <p class="kicker">${esc(c.faq.kicker)}</p>
      <h2>${esc(c.faq.headline)}</h2>
    </div>
    <div class="faq">
      ${c.faq.items
        .map(
          (f, i) => `<details${i === 0 ? " open" : ""}>
        <summary>${esc(f.q)}</summary>
        <div><p>${esc(f.a)}</p></div>
      </details>`
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;

const ctaFinal = () => `
<section class="section cta-final">
  <div class="wrap">
    <p class="kicker">${esc(c.cta.kicker)}</p>
    <h2>${esc(c.cta.headline)}</h2>
    <p class="lede">${esc(c.cta.body)}</p>
    <div class="btns">
      <a class="btn btn--primary btn--lg" href="${esc(c.cta.primaryCta.href)}">${esc(c.cta.primaryCta.label)}</a>
      <a class="btn btn--ghost btn--lg" href="${esc(c.cta.secondaryCta.href)}">${esc(c.cta.secondaryCta.label)}</a>
    </div>
  </div>
</section>`;

const footer = () => `
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="#top" style="color:var(--accent-hi)">${MARK}<span class="brand__name">${esc(c.brand.name)}</span></a>
        <p>${esc(c.footer.blurb)}</p>
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
    <div class="footer__base"><span>${esc(c.footer.copyright)}</span></div>
  </div>
</footer>`;

const schema = () =>
  `<script type="application/ld+json">\n${JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: c.brand.product,
      applicationCategory: "BusinessApplication",
      description: c.meta.description,
      url: c.meta.url,
      audience: { "@type": "Audience", audienceType: c.brand.audience },
      offers: c.pricing.tiers.map((t) => ({
        "@type": "Offer",
        name: t.name,
        price: t.price.replace(/[^0-9.]/g, ""),
        priceCurrency: "USD",
      })),
    },
    null,
    2
  )}\n</script>`;

const BODY = [
  header(),
  '<main id="main">',
  hero(),
  problem(),
  how(),
  features(),
  compare(),
  testimonial(),
  pricing(),
  faq(),
  ctaFinal(),
  "</main>",
  footer(),
].join("\n");

/* ---------------------------------------------------------------- write -- */

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
<meta name="theme-color" content="#101618">
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

const preview = `<title>${esc(c.brand.product)}</title>
${FONTS}
<style>
${css}
</style>
${BODY}
`;
writeFileSync(resolve(ROOT, "preview.html"), preview);

console.log("dist/index.html      " + page.length.toLocaleString() + " bytes");
console.log("dist/assets/styles.css " + css.length.toLocaleString() + " bytes");
console.log("preview.html         " + preview.length.toLocaleString() + " bytes");
