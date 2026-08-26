/**
 * Renders the Infinity Development site from content.json.
 *
 *   node build.mjs
 *
 * Outputs:
 *   dist/index.html, dist/assets/styles.css   deployable static site
 *   preview.html                              single-file build for Artifact
 *
 * All copy lives in content.json. Colours and type are the :root block at the
 * top of assets/styles.css.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const c = JSON.parse(readFileSync(resolve(ROOT, "content.json"), "utf8"));
const css = readFileSync(resolve(ROOT, "assets/styles.css"), "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n2 = (i) => String(i + 1).padStart(2, "0");

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">';

/* Lemniscate wordmark — deliberately distinct from the reference site's
   two-ring logo, and on the company's own name. */
const MARK = `<svg class="brand__mark" viewBox="0 0 68 40" fill="none" aria-hidden="true">
  <path d="M34 20C39 11 45 6 52 6C60 6 65 12 65 20C65 28 60 34 52 34C45 34 39 29 34 20C29 11 23 6 16 6C8 6 3 12 3 20C3 28 8 34 16 34C23 34 29 29 34 20Z"
        stroke="currentColor" stroke-width="4.4" stroke-linejoin="round"/>
</svg>`;

const WORDMARK = `<span class="brand__name">${c.brand.wordmarkLines
  .map((l, i) => `<span class="brand__line brand__line--${i + 1}">${esc(l)}</span>`)
  .join("")}</span>`;

const ICONS = {
  globe:  '<circle cx="21" cy="21" r="15.5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M5.5 21h31M21 5.5c4.2 4.4 6.3 9.6 6.3 15.5S25.2 32.1 21 36.5c-4.2-4.4-6.3-9.6-6.3-15.5S16.8 9.9 21 5.5Z" stroke="currentColor" stroke-width="2" fill="none"/>',
  puzzle: '<path d="M9 12h7a3.4 3.4 0 1 1 6.8 0H30v7.2a3.4 3.4 0 1 0 0 6.8V33h-7.2a3.4 3.4 0 1 0-6.8 0H9z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  rocket: '<path d="M18 27 8 25l4.5-7.6 5.5.9M15 24l3 3M24 24l2 10 7.6-4.5-.9-5.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/><path d="M18 27c-3-7 0-15 7.6-19.6C29.8 4.9 34 5 36 5.4c.4 2 .5 6.2-2 10.4C29.4 23.4 25 26.4 18 27Z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  shield: '<path d="M21 5 8.5 10v9.6c0 7.4 5.3 13.9 12.5 15.4 7.2-1.5 12.5-8 12.5-15.4V10z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/><path d="m15.5 20.4 4 4.2 7.2-8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  nodes:  '<circle cx="8.5" cy="30" r="4" stroke="currentColor" stroke-width="2.2" fill="none"/><circle cx="19" cy="21" r="4" stroke="currentColor" stroke-width="2.2" fill="none"/><circle cx="29" cy="26" r="4" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="m11.8 27.4 4-3.6M22.6 22.6l3 2.2M32 23 37 12m0 0-5.2.6M37 12l.8 5.2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  cloud:  '<path d="M13 31a7 7 0 0 1-.4-14 9.4 9.4 0 0 1 18-2.2A6.6 6.6 0 0 1 29.6 31z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  pen:    '<path d="M11 15c3-3.6 6.4-5.4 10-5.4S28 11.4 31 15" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M21 12v6M17.4 18h7.2l-3.6 15z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  support:'<path d="M9 24v-3a12 12 0 0 1 24 0v3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="5.5" y="22.5" width="7" height="10" rx="3" stroke="currentColor" stroke-width="2.2" fill="none"/><rect x="29.5" y="22.5" width="7" height="10" rx="3" stroke="currentColor" stroke-width="2.2" fill="none"/>',
};
const icon = (k) => `<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">${ICONS[k] || ICONS.globe}</svg>`;

/* IMG resolves an image name to a src — swapped between the dist build
   (relative path) and the single-file preview (inline data URI). */
let IMG = (n) => "assets/img/" + n + ".jpg";
const dataUri = (n) =>
  "data:image/jpeg;base64," + readFileSync(resolve(ROOT, "assets/img/" + n + ".jpg")).toString("base64");
const photo = (name, eager) =>
  `<div class="ph"><img src="${IMG(name)}" alt=""${eager ? "" : ' loading="lazy"'}></div>`;

const spine = (num) => `<div class="spine"><span class="spine__num">${esc(num)}</span><span class="spine__line"></span></div>`;

/* ------------------------------------------------------------- sections -- */

const header = () => `
<header class="masthead" id="masthead">
  <div class="wrap">
    <a class="brand" href="#top">${MARK}${WORDMARK}</a>
    <nav class="nav" aria-label="Primary">
      ${c.nav.map((x) => `<a href="${esc(x.href)}">${esc(x.label)}</a>`).join("\n      ")}
    </nav>
    <a class="corner corner--desk" href="#contact">Contact us</a>
    <button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobilemenu">
      <span></span><span></span>
    </button>
  </div>
</header>`;

/* Full-screen overlay menu, mirroring the reference site's mobile pattern:
   logo kept top-left, close control top-right, links stacked right of centre
   with the ring motif behind them. */
const MMENU = `
<div class="mmenu" id="mobilemenu" hidden>
  <span class="mmenu__disc" aria-hidden="true"></span>
  <div class="mmenu__bar">
    <a class="brand" href="#top" data-close>${MARK}${WORDMARK}</a>
    <button class="mmenu__close" id="mclose" type="button" aria-label="Close menu">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M7 7l20 20M27 7 7 27" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    </button>
  </div>
  <nav class="mmenu__nav" aria-label="Mobile">
    ${c.nav.map((x) => `<a href="${esc(x.href)}" data-close>${esc(x.label)}</a>`).join("\n    ")}
    <a class="corner" href="#contact" data-close>Contact us</a>
  </nav>
</div>`;

const hero = () => `
<section class="hero" id="top">
  <div class="hero__photo">${photo(c.hero.img, true)}</div>
  <div class="wrap">
    <div class="hero__grid">
      ${spine(c.hero.num)}
      <div>
        <h1>${esc(c.hero.headline)}</h1>
        <p class="hero__body">${esc(c.hero.body)}</p>
      </div>
    </div>
  </div>
</section>`;

const services = () => `
<section class="sect sect--dark" id="services">
  <div class="wrap">
    <div class="sect__grid">
      ${spine(c.services.num)}
      <div>
        <p class="sect__label">${esc(c.services.label)}</p>
        <div class="sect__head">
          <h2>${esc(c.services.headline)}</h2>
          <div class="sect__intro"><p>${esc(c.services.intro)}</p></div>
        </div>
        <div class="svc-grid">
          ${c.services.items
            .map(
              (s, i) => `<article class="svc">
            <span class="svc__num">${n2(i)}</span>
            ${photo(s.img)}
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.body)}</p>
          </article>`
            )
            .join("\n          ")}
        </div>
      </div>
    </div>
  </div>
</section>`;

const advantages = () => `
<section class="sect sect--light" id="advantages">
  <div class="wrap">
    <div class="sect__grid">
      ${spine(c.advantages.num)}
      <div>
        <p class="sect__label">${esc(c.advantages.label)}</p>
        <h2 style="margin-bottom:clamp(30px,4.5vw,56px)">${esc(c.advantages.headline)}</h2>
        <div class="adv-grid">
          ${c.advantages.items
            .map(
              (a) => `<article class="adv">
            <div class="adv__icon">${icon(a.icon)}</div>
            <h3>${esc(a.title)}</h3>
            <p>${esc(a.body)}</p>
          </article>`
            )
            .join("\n          ")}
        </div>
      </div>
    </div>
  </div>
</section>`;

const benefitCard = (b, i) => `<article class="ben">
            <span class="ben__num">${n2(i)}</span>
            <span class="ben__bar">${esc(b.title)}</span>
            <p>${esc(b.body)}</p>
          </article>`;

const benefits = () => `
<section class="sect sect--dark" id="benefits">
  <svg class="ring" viewBox="0 0 760 760" aria-hidden="true"><circle cx="380" cy="380" r="330"/><circle cx="380" cy="380" r="215"/></svg>
  <div class="wrap">
    <div class="sect__grid">
      ${spine(c.benefits.num)}
      <div>
        <p class="sect__label">${esc(c.benefits.label)}</p>
        <h2 style="max-width:18ch;margin-bottom:clamp(32px,4.6vw,58px)">${esc(c.benefits.headline)}</h2>
        <div class="ben-grid">
          ${c.benefits.items.slice(0, 3).map((b, i) => benefitCard(b, i)).join("\n          ")}
        </div>
        <div class="ben-grid ben-grid--split">
          ${c.benefits.items.slice(3).map((b, i) => benefitCard(b, i + 3)).join("\n          ")}
        </div>
      </div>
    </div>
  </div>
</section>`;

const design = () => {
  const narrow = c.design.cards.filter((x) => !x.wide);
  const wide = c.design.cards.filter((x) => x.wide);
  const card = (d, mod = "") => `<article class="dz${mod}">
            <div class="ph" style="aspect-ratio:${mod ? "21/8" : "4/3.4"}"><img src="${IMG(d.img)}" alt="" loading="lazy"></div>
            <div class="dz__cap"><span class="dz__title">${esc(d.title)}</span><span class="dz__rule"></span></div>
          </article>`;
  return `
<section class="sect sect--light" id="design">
  <div class="wrap">
    <div class="sect__grid">
      ${spine(c.design.num)}
      <div>
        <p class="sect__label">${esc(c.design.label)}</p>
        <div class="sect__head">
          <h2>${esc(c.design.headline)}</h2>
          <div class="sect__intro"><p>${esc(c.design.intro)}</p></div>
        </div>
        <div class="dz-grid">
          ${narrow.map((d) => `<div>${card(d)}</div>`).join("\n          ")}
        </div>
        <div class="dz-grid dz-grid--wide">
          ${wide.map((d) => `<div>${card(d, " dz--wide")}</div>`).join("\n          ")}
        </div>
      </div>
    </div>
  </div>
</section>`;
};

const contact = () => `
<section class="sect sect--dark contact" id="contact">
  <div class="wrap">
    <div class="sect__grid">
      ${spine(c.contact.num)}
      <div>
        <p class="sect__label">${esc(c.contact.label)}</p>
        <h2>${esc(c.contact.headline)}</h2>
        <p class="contact__body">${esc(c.contact.body)}</p>
        <a class="mailbtn" href="mailto:${esc(c.brand.email)}">${esc(c.contact.buttonLabel)}</a>
      </div>
    </div>
  </div>
</section>`;

const footer = () => `
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="#top">${MARK}${WORDMARK}</a>
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
    <div class="footer__base"><span>${esc(c.footer.copyright)}</span><span class="sp">${esc(c.brand.domain)}</span></div>
  </div>
</footer>`;

const TOTOP = `
<button class="totop" id="totop" type="button" aria-label="Back to top">
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 16V5M4.8 10.2 10 5l5.2 5.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>`;

const SCRIPT = `
<script>
(function () {
  var head = document.getElementById("masthead");
  var top = document.getElementById("totop");
  function onScroll() {
    var y = window.scrollY || 0;
    if (head) head.classList.toggle("is-stuck", y > window.innerHeight * 0.85);
    if (top) top.classList.toggle("is-on", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener("click", function () {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobilemenu");
  var close = document.getElementById("mclose");

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    document.body.classList.toggle("menu-open", open);
    if (open) {
      requestAnimationFrame(function () { menu.classList.add("is-open"); });
      if (close) close.focus();
    } else {
      menu.classList.remove("is-open");
      burger.focus();
    }
  }

  if (burger) burger.addEventListener("click", function () { setMenu(menu.hidden); });
  if (close) close.addEventListener("click", function () { setMenu(false); });
  if (menu) {
    menu.addEventListener("click", function (e) {
      /* A menu link, or any backdrop area that is not itself a control. */
      if (e.target.closest("[data-close]") || !e.target.closest("a, button")) setMenu(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu && !menu.hidden) setMenu(false);
  });
  window.addEventListener("resize", function () {
    if (menu && !menu.hidden && window.innerWidth > 1000) setMenu(false);
  });
})();
</script>`;

const makeBody = () => [
  header(),
  MMENU,
  '<main id="main">',
  hero(),
  services(),
  advantages(),
  benefits(),
  design(),
  contact(),
  "</main>",
  footer(),
  TOTOP,
].join("\n");

const BODY = makeBody();            // dist: relative image paths
IMG = dataUri;
const BODY_PREVIEW = makeBody();    // preview: self-contained data URIs

const schema = () =>
  `<script type="application/ld+json">\n${JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: c.brand.name,
      description: c.meta.description,
      url: c.meta.url,
      email: c.brand.email,
      foundingDate: c.brand.founded,
      knowsAbout: c.benefits.items.map((b) => b.title),
    },
    null,
    2
  )}\n</script>`;

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
<meta name="theme-color" content="#1F2222">
${FONTS}
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${BODY}
${schema()}
${SCRIPT}
</body>
</html>
`;

mkdirSync(resolve(ROOT, "dist/assets"), { recursive: true });
writeFileSync(resolve(ROOT, "dist/index.html"), page);
copyFileSync(resolve(ROOT, "assets/styles.css"), resolve(ROOT, "dist/assets/styles.css"));
copyFileSync(resolve(ROOT, "landing.html"), resolve(ROOT, "dist/landing.html"));
mkdirSync(resolve(ROOT, "dist/assets/img"), { recursive: true });
for (const f of readdirSync(resolve(ROOT, "assets/img")))
  copyFileSync(resolve(ROOT, "assets/img", f), resolve(ROOT, "dist/assets/img", f));
writeFileSync(
  resolve(ROOT, "preview.html"),
  `<title>${esc(c.brand.name)}</title>\n${FONTS}\n<style>\n${css}\n</style>\n${BODY_PREVIEW}\n${SCRIPT}\n`
);

console.log("dist/index.html  " + page.length.toLocaleString() + " bytes");
console.log("preview.html     built");
