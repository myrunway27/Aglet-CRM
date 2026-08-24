/**
 * Composes the interior pages from the chrome defined once in site/index.html.
 * Run: node scripts/build-site.mjs
 *
 * index.html is hand-authored and is the source of the shared header/footer.
 * Everything else is generated so the chrome can never drift between pages.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = readFileSync(resolve(ROOT, "site/index.html"), "utf8");

const slice = (start, end) => {
  const a = home.indexOf(start);
  const b = home.indexOf(end);
  if (a < 0 || b < 0) throw new Error("marker not found: " + start);
  return home.slice(a, b).trimEnd();
};

const SPRITE   = slice("<!-- ============================================================ sprite -->", "<!-- =========================================================== utility -->");
const UTILITY  = slice("<!-- =========================================================== utility -->", "<!-- ========================================================== masthead -->");
const MASTHEAD = slice("<!-- ========================================================== masthead -->", "<main id=\"main\">");
const FOOTER   = slice("<!-- ============================================================ footer -->", "<!-- ========================================================== schema -->");

/** Rewrite root-relative links for pages living in a subdirectory. */
const rebase = (html, prefix) =>
  prefix
    ? html
        .replaceAll('href="assets/', `href="${prefix}assets/`)
        .replaceAll('href="index.html"', `href="${prefix}index.html"`)
        .replaceAll('href="services/', `href="${prefix}services/`)
        .replaceAll('href="locations/', `href="${prefix}locations/`)
        .replaceAll('href="pricing.html"', `href="${prefix}pricing.html"`)
        .replaceAll('href="#', `href="${prefix}index.html#`)
    : html;

/** Mark the current page in the primary nav. */
const markCurrent = (html, needle) =>
  needle ? html.replace(`href="${needle}"`, `href="${needle}" aria-current="page"`) : html;

const page = ({ file, prefix = "", title, description, canonical, navCurrent, crumbs, body, schema = [] }) => {
  const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#221A15">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}assets/styles.css">
</head>
<body>

<a class="skip" href="#main">Skip to content</a>

${SPRITE}

${rebase(UTILITY, prefix)}

${markCurrent(rebase(MASTHEAD, prefix), navCurrent)}

<main id="main">

<div class="wrap crumbs">
  <ol>${crumbs.map((c) => (c.href ? `<li><a href="${c.href}">${c.label}</a></li>` : `<li>${c.label}</li>`)).join("")}</ol>
</div>

${body}

</main>

${rebase(FOOTER, prefix)}

${schema.map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join("\n")}

</body>
</html>
`;
  const out = resolve(ROOT, "site", file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, head);
  return { file, bytes: head.length };
};

const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: it.url,
  })),
});

/* ======================================================================
   1. Service page — targets "custom kitchen cabinets" (design + build
   intent, deliberately NOT geo-targeted, so it cannot cannibalise the
   homepage's "custom kitchen cabinets fort lauderdale").
   ====================================================================== */

const kitchens = page({
  file: "services/custom-kitchens.html",
  prefix: "../",
  title: "Custom Kitchen Cabinets — Designed &amp; Milled In-House | Delta Woodworks",
  description:
    "How a Delta kitchen gets built: 3D design, Columbia Forest plywood boxes, Blum hardware, sprayed in our own booth and installed by our crew in 4–8 weeks.",
  canonical: "https://deltawoodworksfl.com/services/custom-kitchens/",
  navCurrent: "../services/custom-kitchens.html",
  crumbs: [
    { label: "Home", href: "../index.html" },
    { label: "What we build", href: "../index.html#services" },
    { label: "Custom kitchens" },
  ],
  body: `
<section class="phero">
  <svg class="phero__grain" aria-hidden="true" preserveAspectRatio="none" style="width:100%;height:100%">
    <rect width="100%" height="100%" filter="url(#grain-a)" opacity=".13"/>
  </svg>
  <div class="wrap">
    <div class="phero__inner">
      <p class="eyebrow">Custom kitchens</p>
      <h1>A kitchen cut to your walls, not to a catalogue</h1>
      <p class="lede">Every Delta kitchen is drawn in 3D, milled on South Andrews Avenue and installed by the people who built it. Here is exactly what that involves, and what separates it from an ordered kitchen.</p>
      <div class="btn-row" style="margin-top:1.5rem">
        <a class="btn btn--primary btn--lg" href="../index.html#book">Book a showroom visit</a>
        <a class="btn btn--ghost btn--lg" href="../pricing.html">See pricing</a>
      </div>
    </div>
  </div>
</section>

<div class="trustbar">
  <div class="wrap">
    <ul>
      <li><svg width="15" height="15" aria-hidden="true"><use href="#i-ruler"/></svg> Drawn in 3D before cutting</li>
      <li><svg width="15" height="15" aria-hidden="true"><use href="#i-box"/></svg> Plywood boxes, never particleboard</li>
      <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Blum soft-close throughout</li>
      <li><svg width="15" height="15" aria-hidden="true"><use href="#i-clock"/></svg> 4–8 weeks</li>
    </ul>
  </div>
</div>

<section class="section">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">What "custom" means here</p>
        <h2>Three words the industry uses loosely</h2>
        <p><b>Stock</b> means fixed sizes off a shelf. <b>Semi-custom</b> means a stock box with more door and finish choices — the gaps still get filler strips. <b>Custom</b> should mean the box itself is made for your wall.</p>
        <p>Most South Florida showrooms selling "custom cabinetry" are selling semi-custom from a catalogue, because they have no shop. We only make the third kind. If your island needs to be 87 and three-quarter inches, that is what leaves the mill.</p>
        <div class="note" style="margin-top:1.4rem">
          <p><strong>How to check any cabinet company —</strong> ask where the boxes are made and how long freight takes. If there is a freight answer, they did not build it.</p>
        </div>
      </div>
      <figure class="shot shot--wide">
        <div class="shot__frame">
          <svg class="shot__grain" aria-hidden="true" preserveAspectRatio="none" style="width:100%;height:100%"><rect width="100%" height="100%" filter="url(#grain-b)" opacity=".2"/></svg>
          <span class="shot__badge">Detail photograph</span>
        </div>
        <figcaption class="shot__cap"><b>Shot list:</b> two boxes side by side — a scribed Delta box against a wall with a filler strip visible on a stock box. The comparison does the arguing for you.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="section band">
  <div class="wrap">
    <div class="section__head">
      <p class="eyebrow">Included as standard</p>
      <h2>What is in every kitchen we build</h2>
      <p>Not an upgrade list. This is the baseline, because building it any other way in this climate creates a callback in year four.</p>
    </div>
    <div class="grid grid--3">
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-box"/></svg></div>
        <h3>Columbia Forest plywood carcasses</h3>
        <p>Formaldehyde-free hardwood plywood, edge-banded in matching species. Particleboard swells; plywood does not.</p>
      </div>
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-check"/></svg></div>
        <h3>Blum hinges and runners</h3>
        <p>Soft-close undermount slides rated for the full drawer, adjustable in three planes, lifetime warranty.</p>
      </div>
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-drop"/></svg></div>
        <h3>Sprayed and cured in-house</h3>
        <p>Conversion varnish or low-VOC lacquer in our own booth — never brushed on site, never shipped wet.</p>
      </div>
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-ruler"/></svg></div>
        <h3>Dovetailed solid drawer boxes</h3>
        <p>Solid maple, dovetailed and finished inside and out, sized to the opening rather than to a standard.</p>
      </div>
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-mill"/></svg></div>
        <h3>Integrated panels and hoods</h3>
        <p>Fridge and dishwasher panels, custom hood surrounds and toe-kick detailing milled with the run, so grain matches.</p>
      </div>
      <div class="card">
        <div class="card__icon"><svg width="26" height="26" aria-hidden="true"><use href="#i-shield"/></svg></div>
        <h3>Scribed installation</h3>
        <p>South Florida walls are rarely square — especially in older houses. Every run is scribed on site by our crew.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap wrap--narrow prose">
    <h2>Choosing a door style</h2>
    <p>Door style drives more of the final look — and more of the price — than any other decision. Four cover most of what leaves our shop:</p>
    <ul>
      <li><b>Shaker.</b> A flat centre panel in a square frame. The safest choice in a resale market, and the least expensive to mill well.</li>
      <li><b>Slab.</b> A single flat face, usually in rift-sawn white oak or a sprayed colour. Reads modern; shows grain, so material selection matters more.</li>
      <li><b>Inset.</b> Doors sitting flush inside the frame rather than on top of it. The hardest to build and hold in this climate, and the most expensive — it is where a real mill separates itself.</li>
      <li><b>Raised panel.</b> Traditional profile, still the right answer in Mediterranean-revival and older coastal houses.</li>
    </ul>

    <h2>Species that behave in this climate</h2>
    <p>Wood moves with humidity. In a house that swings from 45% in February to 90% in August, some species move considerably more than others:</p>
    <ul>
      <li><b>White oak</b> — the most stable and the most requested. Rift-sawn for modern slab work, quarter-sawn for traditional.</li>
      <li><b>Hard maple</b> — tight, near-featureless grain. The right substrate for painted kitchens.</li>
      <li><b>Sapele</b> — mahogany-like, very stable, excellent for wall units and coastal houses.</li>
      <li><b>Cherry and hickory</b> — beautiful, but they move. We will build them; we will also tell you what to expect.</li>
    </ul>

    <h2>How long it takes</h2>
    <p>Four to eight weeks from approved design to installed kitchen, driven mostly by finish. A stained clear-coat run moves faster than a multi-step painted finish. Because the shop is ten minutes from most of our installs, a mid-build change costs days, not a restarted lead time.</p>
  </div>
</section>

<section class="section cta-final" style="background:var(--surface-2);border-top:1px solid var(--border)">
  <div class="wrap">
    <p class="eyebrow eyebrow--center">Next step</p>
    <h2>Bring your measurements</h2>
    <p class="lede">Or let us take them. Either way you leave with a 3D model and a fixed number — not an estimate that moves.</p>
    <div class="btn-row">
      <a class="btn btn--primary btn--lg" href="tel:+19549398579"><svg width="16" height="16" aria-hidden="true"><use href="#i-phone"/></svg> (954) 939-8579</a>
      <a class="btn btn--ghost btn--lg" href="../pricing.html">See what it costs</a>
    </div>
  </div>
</section>
`,
  schema: [
    breadcrumbSchema([
      { name: "Home", url: "https://deltawoodworksfl.com/" },
      { name: "Custom kitchens", url: "https://deltawoodworksfl.com/services/custom-kitchens/" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Custom kitchen cabinet design, fabrication and installation",
      provider: { "@id": "https://deltawoodworksfl.com/#business" },
      areaServed: ["Broward County, Florida", "Miami-Dade County, Florida", "Palm Beach County, Florida"],
      description:
        "Custom kitchen cabinetry designed in 3D and milled in-house in Fort Lauderdale: Columbia Forest plywood carcasses, Blum soft-close hardware, dovetailed solid maple drawer boxes, sprayed and cured in our own booth.",
    },
  ],
});

/* ======================================================================
   2. Pricing page — the gap no competitor fills.
   ====================================================================== */

const pricing = page({
  file: "pricing.html",
  title: "What Custom Kitchen Cabinets Cost in South Florida | Delta Woodworks",
  description:
    "Real 2026 numbers for custom cabinetry in Broward, Miami-Dade and Palm Beach: per-linear-foot ranges, what drives the price up, and where the money is worth spending.",
  canonical: "https://deltawoodworksfl.com/pricing/",
  navCurrent: "pricing.html",
  crumbs: [{ label: "Home", href: "index.html" }, { label: "Pricing" }],
  body: `
<section class="phero">
  <svg class="phero__grain" aria-hidden="true" preserveAspectRatio="none" style="width:100%;height:100%">
    <rect width="100%" height="100%" filter="url(#grain-c)" opacity=".13"/>
  </svg>
  <div class="wrap">
    <div class="phero__inner">
      <p class="eyebrow">Pricing</p>
      <h1>What custom cabinetry actually costs in South Florida</h1>
      <p class="lede">Every other shop in this market makes you book an appointment to find out. Here are the numbers, what moves them, and where the money is and is not worth spending.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="price-grid">
      <div class="tier">
        <div class="tier__name">Refit</div>
        <p style="font-size:.92rem">Same footprint, new cabinetry. The most common condo project on the beach.</p>
        <div class="tier__range">$650–$900</div>
        <div class="tier__unit">per linear foot, installed</div>
        <ul>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Plywood boxes, Blum hardware</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Painted or stained shaker</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Demo, install and haul-away</li>
        </ul>
        <a class="btn btn--ghost btn--block" href="index.html#book">Get a fixed quote</a>
      </div>
      <div class="tier tier--featured">
        <span class="tier__flag">Most projects</span>
        <div class="tier__name">Full custom kitchen</div>
        <p style="font-size:.92rem">New layout, island, hood and appliance panels, drawn from scratch.</p>
        <div class="tier__range">$900–$1,400</div>
        <div class="tier__unit">per linear foot, installed</div>
        <ul>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> 3D model and full elevations</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Any species, profile or finish</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Integrated panels and hood surround</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Interior fit-out and lighting</li>
        </ul>
        <a class="btn btn--primary btn--block" href="index.html#book">Book a showroom visit</a>
      </div>
      <div class="tier">
        <div class="tier__name">Whole-home millwork</div>
        <p style="font-size:.92rem">Kitchen, baths, closets and built-ins on one schedule, one crew.</p>
        <div class="tier__range">From $45k</div>
        <div class="tier__unit">typical project total</div>
        <ul>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> One point of contact</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Sequenced around your GC</li>
          <li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg> Consistent finish room to room</li>
        </ul>
        <a class="btn btn--ghost btn--block" href="index.html#book">Talk it through</a>
      </div>
    </div>

    <div class="note" style="margin-top:clamp(22px,3vw,32px)">
      <p><strong>Design mockup note —</strong> these ranges are placeholders built from published 2026 South Florida market data ($500–$1,500+ per linear foot installed for true custom; South Florida runs 15–25% above Central Florida). Swap in Delta's real numbers before publishing. Publishing <em>a</em> number matters more than which number.</p>
    </div>
  </div>
</section>

<section class="section band">
  <div class="wrap">
    <div class="section__head">
      <p class="eyebrow">Reading a quote</p>
      <h2>Where the market sits</h2>
      <p>Four tiers get sold as "cabinets" in South Florida, and the price gap between them is mostly a materials-and-labour gap, not a margin gap.</p>
    </div>
    <div class="compare">
      <div class="compare__scroll">
        <table>
          <caption class="visually-hidden">Cabinet tiers and installed cost per linear foot in South Florida</caption>
          <thead>
            <tr><th scope="col">Tier</th><th scope="col">Installed, per linear foot</th><th scope="col">What you are actually buying</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Ready-to-assemble</th><td>$120–$280</td><td>Flat-packed particleboard, fixed sizes, assembled on site</td></tr>
            <tr><th scope="row">Stock</th><td>$200–$400</td><td>Pre-built standard boxes, limited door and finish range</td></tr>
            <tr><th scope="row">Semi-custom</th><td>$350–$700</td><td>Standard boxes with wider door, finish and interior options</td></tr>
            <tr><th scope="row">True custom</th><td>$650–$1,400+</td><td>Boxes built to your dimensions in a shop, in your species and finish</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap wrap--narrow prose">
    <h2>What moves the number</h2>
    <ul>
      <li><b>Finish, more than anything.</b> A multi-step painted or glazed finish can add 15–30% over a stained clear coat, because it is days of additional booth time.</li>
      <li><b>Inset doors.</b> Expect 20–35% over overlay. The tolerances are unforgiving and the fitting is slow.</li>
      <li><b>Species.</b> Painted maple is the value baseline. Rift-sawn white oak and sapele carry a real material premium.</li>
      <li><b>Interior fit-out.</b> Dividers, spice pull-outs, trash carriers, integrated lighting and charging — easy to add $3,000–$8,000 to a mid-sized kitchen.</li>
      <li><b>Ceiling height.</b> Runs to a 10-foot ceiling mean upper boxes, crown build-up and more finish surface.</li>
      <li><b>Condo access.</b> Elevator scheduling, protection requirements and restricted work hours add labour on the beach and in high-rises.</li>
    </ul>

    <h2>Where the money is worth spending</h2>
    <p>If a budget has to be trimmed, trim it in this order — the first items are visible for twenty years, the last are cosmetic.</p>
    <ol>
      <li><b>Box material.</b> Never trade plywood for particleboard to save money. It is the one decision that cannot be revisited.</li>
      <li><b>Hardware.</b> Blum runners outlive the kitchen. Cheap slides are the most common callback in this trade.</li>
      <li><b>Layout and fit.</b> Paying for boxes that fill the wall properly beats paying for a fancier door on a run full of fillers.</li>
      <li><b>Door style.</b> Shaker instead of inset is the single largest honest saving available.</li>
      <li><b>Interior extras.</b> Pull-outs and organisers can be added later; the boxes cannot.</li>
    </ol>

    <h2>How we quote</h2>
    <p>We measure, model the kitchen in 3D, and issue a fixed proposal with every elevation drawn. No allowances that drift, and no change-order surprises unless you change something. If the number is wrong for your budget, we would rather tell you at the measure than at the deposit.</p>
  </div>
</section>

<section class="section" style="background:var(--surface-2);border-block:1px solid var(--border)">
  <div class="wrap wrap--narrow">
    <div class="section__head"><p class="eyebrow">Cost questions</p><h2>Straight answers</h2></div>
    <div class="faq">
      <details open>
        <summary>How much is a 10x10 kitchen in Fort Lauderdale?</summary>
        <div><p>A "10x10" is a 20-linear-foot benchmark. At our refit range that is roughly $13,000–$18,000 installed; a full custom version with an island and integrated panels lands nearer $18,000–$28,000. Ready-to-assemble comes in around $4,400 — and is a different product entirely.</p></div>
      </details>
      <details>
        <summary>Why is South Florida more expensive than the rest of the state?</summary>
        <div><p>Labour, insurance and access. Published market data puts Palm Beach, Broward and Miami-Dade about 15–25% above Central Florida for identical scope. Condo access rules add real hours on the beach.</p></div>
      </details>
      <details>
        <summary>Is custom actually more expensive than semi-custom?</summary>
        <div><p>Per linear foot, yes. Per finished kitchen, less than people expect — a custom run fills the wall instead of paying for fillers and dead corners, so the linear-foot count is often lower.</p></div>
      </details>
      <details>
        <summary>Do you require a deposit?</summary>
        <div><p>Yes — a deposit at design approval, a progress payment when the run goes into finishing, and the balance on completed installation and a closed punch list.</p></div>
      </details>
    </div>
  </div>
</section>

<section class="section cta-final">
  <div class="wrap">
    <h2>Get a real number for your kitchen</h2>
    <p class="lede">A free measure and a 3D proposal. If we are not the right fit, we will say so.</p>
    <div class="btn-row">
      <a class="btn btn--primary btn--lg" href="tel:+19549398579"><svg width="16" height="16" aria-hidden="true"><use href="#i-phone"/></svg> (954) 939-8579</a>
      <a class="btn btn--ghost btn--lg" href="index.html#book">Request a measure</a>
    </div>
  </div>
</section>
`,
  schema: [
    breadcrumbSchema([
      { name: "Home", url: "https://deltawoodworksfl.com/" },
      { name: "Pricing", url: "https://deltawoodworksfl.com/pricing/" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How much is a 10x10 kitchen in Fort Lauderdale?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A 10x10 is a 20-linear-foot benchmark. At refit pricing that is roughly $13,000-$18,000 installed; a full custom version with an island and integrated panels lands nearer $18,000-$28,000.",
          },
        },
        {
          "@type": "Question",
          name: "Why is South Florida more expensive than the rest of the state?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Labour, insurance and site access. Palm Beach, Broward and Miami-Dade run about 15-25% above Central Florida for identical scope, and condo access rules add hours on the beach.",
          },
        },
        {
          "@type": "Question",
          name: "Is custom actually more expensive than semi-custom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Per linear foot, yes. Per finished kitchen, less than people expect, because a custom run fills the wall instead of paying for filler strips and dead corners.",
          },
        },
      ],
    },
  ],
});

/* ======================================================================
   3. Location page — the anti-doorway template. Coral Gables rather than
   Fort Lauderdale on purpose: the homepage owns "fort lauderdale", so a
   Fort Lauderdale city page would cannibalise it. See the teardown doc.
   ====================================================================== */

const gables = page({
  file: "locations/coral-gables.html",
  prefix: "../",
  title: "Custom Kitchen Cabinets in Coral Gables, FL | Delta Woodworks",
  description:
    "Custom cabinetry for Coral Gables homes — Mediterranean-revival millwork, Board of Architects submittals, and inset work that survives 90% humidity. Milled in Fort Lauderdale.",
  canonical: "https://deltawoodworksfl.com/locations/coral-gables/",
  crumbs: [
    { label: "Home", href: "../index.html" },
    { label: "Service area", href: "../index.html#area" },
    { label: "Coral Gables" },
  ],
  body: `
<section class="phero">
  <svg class="phero__grain" aria-hidden="true" preserveAspectRatio="none" style="width:100%;height:100%">
    <rect width="100%" height="100%" filter="url(#grain-b)" opacity=".13"/>
  </svg>
  <div class="wrap">
    <div class="phero__inner">
      <p class="eyebrow">Coral Gables, Miami-Dade County</p>
      <h1>Custom kitchen cabinets for Coral Gables houses</h1>
      <p class="lede">The Gables is the hardest cabinetry market in South Florida to get right — 1920s plaster walls that are nowhere near square, a Board of Architects that reviews exterior work, and Mediterranean-revival interiors where a flat slab door looks wrong. We build for it out of our own mill, 40 minutes up I-95.</p>
      <div class="btn-row" style="margin-top:1.5rem">
        <a class="btn btn--primary btn--lg" href="../index.html#book">Book a measure in the Gables</a>
        <a class="btn btn--ghost btn--lg" href="../pricing.html">See pricing</a>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">What is different here</p>
        <h2>Old houses do not have square walls</h2>
        <p>Most of the housing stock between Granada and Riviera predates 1940. Plaster over hollow tile moves, settles and bows — often by half an inch across a single run. Ordered cabinetry arrives in fixed sizes and gets shimmed and filled until it fits.</p>
        <p>We measure the wall as it actually is, mill to those numbers, and scribe the end panels on site. In a Gables kitchen that is not a premium service; it is the only way to get a run to sit tight against the wall.</p>
        <p>For historic-district properties we produce shop drawings suitable for Board of Architects and permit submittals, and we sequence around your architect and GC rather than the other way round.</p>
      </div>
      <figure class="shot shot--wide">
        <div class="shot__frame">
          <svg class="shot__grain" aria-hidden="true" preserveAspectRatio="none" style="width:100%;height:100%"><rect width="100%" height="100%" filter="url(#grain-c)" opacity=".2"/></svg>
          <span class="shot__badge">Local project photograph</span>
        </div>
        <figcaption class="shot__cap"><b>Shot list:</b> a completed Coral Gables kitchen with recognisable local context — barrel-tile roofline through the window, arched opening, or Dade County pine floors. Local visual proof is what makes a location page outrank a generic one.</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="section band">
  <div class="wrap">
    <div class="section__head">
      <p class="eyebrow">Neighbourhoods we work in</p>
      <h2>Where our Gables installs land</h2>
    </div>
    <div class="grid grid--3">
      <div class="card">
        <h3>Historic core</h3>
        <p>Country Club Prado, Granada, Coral Way. Mediterranean-revival interiors, raised-panel and inset work, arched cabinetry to match existing openings.</p>
      </div>
      <div class="card">
        <h3>Gables By The Sea &amp; Cocoplum</h3>
        <p>Waterfront houses where salt air and humidity are relentless. Sapele and rift white oak, marine-grade considerations, sealed end grain.</p>
      </div>
      <div class="card">
        <h3>Downtown Gables condos</h3>
        <p>High-rise refits on Ponce and Alhambra — elevator scheduling, restricted work hours and building protection requirements handled by our crew.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap wrap--narrow prose">
    <h2>A note on Board of Architects review</h2>
    <p>Coral Gables reviews far more work than neighbouring cities. Interior cabinetry alone generally does not trigger review, but work that changes a window, an exterior opening or a structural element usually does — and that review sits on the critical path of your kitchen. We build our lead time around your permit timeline, and we would rather start milling late than have finished cabinetry sitting in a garage for six weeks.</p>

    <h2>Materials that last in a Gables house</h2>
    <p>Two conditions drive every material decision here: year-round humidity in the 75–90% range, and older houses with limited or uneven air conditioning in the kitchen. That rules out particleboard carcasses outright and makes species choice consequential. White oak, hard maple and sapele are what we recommend and what we stock. Painted finishes are sprayed and fully cured in our booth before anything ships — a painted door finished on site in Miami humidity will not level properly.</p>

    <h2>How far away are you, really?</h2>
    <p>Our mill is at 2416 S Andrews Avenue in Fort Lauderdale — roughly 40 minutes from Miracle Mile outside rush hour. It matters more than it sounds: when a client changes a drawer configuration mid-build, or an appliance arrives with different dimensions than specified, the fix is a shop-floor change and a short drive rather than a re-order and a new lead time.</p>
  </div>
</section>

<section class="section" style="background:var(--surface-2);border-block:1px solid var(--border)">
  <div class="wrap wrap--narrow">
    <div class="section__head"><p class="eyebrow">Coral Gables questions</p><h2>What clients here ask</h2></div>
    <div class="faq">
      <details open>
        <summary>Do you have a Coral Gables showroom?</summary>
        <div><p>No — and deliberately. We keep one location, the working mill in Fort Lauderdale, so you can see your own cabinets being built rather than a display kitchen. It is a 40-minute drive, and we come to you for the measure.</p></div>
      </details>
      <details>
        <summary>Can you match existing millwork in a historic house?</summary>
        <div><p>Yes. That is the advantage of owning a mill — we can match an existing profile by cutting a knife for it rather than choosing the nearest catalogue equivalent.</p></div>
      </details>
      <details>
        <summary>Do you handle condo building requirements?</summary>
        <div><p>Routinely. Certificates of insurance, elevator reservations, floor and elevator protection, and restricted work hours are all normal parts of a downtown Gables install.</p></div>
      </details>
      <details>
        <summary>What does a Coral Gables kitchen cost?</summary>
        <div><p>The same ranges as the rest of our work — roughly $650–$900 per linear foot for a refit and $900–$1,400 for full custom, installed. Historic houses often sit at the upper end because of scribing, inset doors and profile matching.</p></div>
      </details>
    </div>
  </div>
</section>

<section class="section cta-final">
  <div class="wrap">
    <h2>Book a measure in Coral Gables</h2>
    <p class="lede">We come to you, measure the walls as they are, and send back a 3D model with a fixed number.</p>
    <div class="btn-row">
      <a class="btn btn--primary btn--lg" href="tel:+19549398579"><svg width="16" height="16" aria-hidden="true"><use href="#i-phone"/></svg> (954) 939-8579</a>
      <a class="btn btn--ghost btn--lg" href="../index.html#book">Request a measure</a>
    </div>
  </div>
</section>
`,
  schema: [
    breadcrumbSchema([
      { name: "Home", url: "https://deltawoodworksfl.com/" },
      { name: "Service area", url: "https://deltawoodworksfl.com/#area" },
      { name: "Coral Gables", url: "https://deltawoodworksfl.com/locations/coral-gables/" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Custom kitchen cabinets",
      provider: { "@id": "https://deltawoodworksfl.com/#business" },
      areaServed: { "@type": "City", name: "Coral Gables", addressRegion: "FL", addressCountry: "US" },
      description:
        "Custom kitchen cabinetry for Coral Gables homes, including Mediterranean-revival profile matching, inset and raised-panel work, historic-house scribing and downtown condo installations.",
    },
  ],
});

for (const r of [kitchens, pricing, gables]) {
  console.log(`built site/${r.file} (${r.bytes.toLocaleString()} bytes)`);
}
