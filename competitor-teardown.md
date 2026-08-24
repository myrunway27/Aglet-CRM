# Competitor teardown & site redesign — deltawoodworksfl.com

**Business:** Delta Woodworks LLC — custom cabinetry mill & showroom, 2416 S Andrews Ave, Fort Lauderdale FL 33316
**Date:** August 24, 2026
**Companion to:** `seo-audit-deltawoodworksfl.md` (branch `claude/website-seo-optimization-jle39k`)

---

## Method, and its limits

This container's network policy blocks direct page fetching, so **no competitor site was crawled**. Everything below comes from search-index data: indexed titles, snippets, directory profiles, review platforms and published cost guides. That is enough to establish positioning, offers, proof and structure — it is *not* enough to critique anyone's visual design.

Practical consequence: the redesign is argued from **market positioning**, not from "their site looks dated and ours will look better." That is the more durable argument anyway. Two things worth verifying by hand before acting:

- Whether competitors publish pricing anywhere below the fold (nothing surfaced in the index, but absence of evidence is weak evidence).
- Current Google review counts for each competitor — review counts move monthly and directory snapshots lag.

---

## The market

| Competitor | Positioning | Proof they lead with | Structural weakness |
|---|---|---|---|
| **The Kitchenworks** | "35 years designing award-winning kitchens." Exclusive South Florida dealer for Dutch Made Custom Cabinetry; sells Sub-Zero/Wolf, Miele, Viking, Dacor. Showroom on E Sunrise Blvd. | Since 1989, 5.0 on Houzz, AutoCAD design, NFC-certified plywood, low-VOC | **A dealer, not a maker.** Their lead time is somebody else's factory plus freight. Their "custom" is Dutch Made's catalogue. |
| **OC Architectural Woodwork** | Family business, "more than 65 years." Two showrooms (W Oakland Park Blvd; NE 12th Ave, Oakland Park), open six days. | Longevity, showroom footprint, free design consults | Positioning is remodeling-generalist — cabinets sit alongside bath remodels, so nothing is owned outright. |
| **Broward Custom Kitchens** | Since 1980. 3,000 sq ft Pompano Beach showroom, 30+ displays, "American made cabinetry, American materials." | Showroom scale, 45 years, made-in-USA | Same made-in-USA claim Delta has — but they show a *showroom*, Delta can show a *mill*. |
| **D'Cassa** | "High-end European quality," 20+ years, showrooms across FL and the Caribbean. | Premium framing, wide geography | Heavy programmatic city-page strategy (Captiva, Lehigh Acres, Pine Island Center…). Same doorway-page exposure Delta has. |
| **LIOHER** | Wholesale factory-direct modern cabinetry centre, design studio + sample library. | Price/modern aesthetic | Component supplier, not a design-build relationship. |
| **Cabinet IQ** | Franchise. Consultative remodel planning. | Process/consistency | No local craft story at all. |
| **Half Price Cabinets** | Price. | Price. | Competes only on price — sets a floor Delta should stay far away from. |

### What competitors are genuinely beating Delta at, today

Being honest about this matters more than the flattering half:

1. **Review volume and visibility.** The Kitchenworks surfaces a 5.0 Houzz rating and Yelp reviews. Delta's Google Business Profile shows no rating in branded search, and its Yelp listing still sits at the slug `delta-woodworks-no-title`. This is the single biggest gap and no redesign fixes it.
2. **Houzz.** Delta has no Houzz profile. Houzz is where South Florida homeowners and designers actually shop this trade, and Houzz profiles rank organically for "[trade] + [city]".
3. **Showroom theatre.** Competitors lead with big showrooms and appliance brands. Delta leads with… a services list.

---

## The wedge

> **Almost every cabinet company in this market is a dealer or a showroom. Delta owns the mill.**

Delta's own site already says all of this — it is just buried in an About page and a blog post with a typo'd slug (`/did-you-know-we-have-our-own-mil/`):

- Own mill in South Florida; design, fabricate and manufacture in-house; **nothing is ever imported**
- Founded by **two ex-soldiers**; 25+ years
- **3D modelling** before fabrication
- Columbia Forest plywood + Blum soft-close hardware
- **4–8 week** turnaround — against a dealer's 8–16 weeks plus freight

That is a better story than anyone else in the market can tell, and it is currently the seventh thing you learn about the company. The redesign moves it to first position and makes the whole site argue it.

**The line the site is built around:** *We don't sell cabinets. We mill them.*

---

## Redesign decisions

### 1. The homepage argues one thing

Hero: `Custom kitchen cabinets, milled in Fort Lauderdale` — keeps the money term ("custom kitchen cabinets fort lauderdale") in the H1 while the kicker carries the wedge ("Our own mill · Nothing imported"). Prior title led with the brand, which wastes the highest-value slot, and targeted "Custom Kitchens" rather than the term people actually search.

### 2. A dealer-vs-mill comparison table

The most important block on the site. Six rows — who builds it, how it's sized, mid-build changes, lead time, who installs, what happens in year three. Every row is true, checkable, and unanswerable by a dealer. It reframes the entire category so that the shopper's next showroom visit becomes an interrogation: *"where are these actually made, and how long is freight?"*

### 3. Publish pricing

No competitor in this market puts a number on a page. Cost queries are the highest-intent traffic available in the trade, and every one of them currently goes to national aggregators instead of to a local shop. The redesign includes a full `/pricing/` page: per-linear-foot ranges by tier, a market tier table, what drives the number, and where to cut a budget.

This is also the biggest commercial argument in the document, so it deserves the counter-argument: publishing prices costs you the shoppers who would have been talked up in a showroom, and hands your ranges to competitors. My read is that it wins anyway — Delta is not competing on price against Half Price Cabinets, and pre-qualified leads are worth more than volume to a shop with 4–8 week capacity. But it is a business call, not an SEO one. **Numbers in the mockup are market-derived placeholders and must be replaced with Delta's real figures.**

### 4. Florida climate as a technical differentiator

South Florida runs 75–90% relative humidity all summer. That fact turns "we use Columbia Forest plywood, not particleboard" from a spec-sheet line into a reason. It also generates genuinely useful content — species stability, finish curing, why a door that fit in January binds in August — that no competitor is writing.

### 5. Fix the doorway-page problem instead of extending it

The SEO audit flagged ~25 thin city pages (including El Portal and Florida City) matching Google's doorway-page pattern, plus two Boca Raton pages competing with each other and a Fort Lauderdale page cannibalising the homepage. The redesign replaces that with:

- **Three county hubs** on the homepage — Broward, Miami-Dade, Palm Beach.
- **Real location pages only where there is something real to say.** The template built here is **Coral Gables**, not Fort Lauderdale, and that choice is deliberate: the homepage owns "fort lauderdale", so a Fort Lauderdale city page can only cannibalise it. **Recommendation: 301 the existing Fort Lauderdale city page to the homepage.**
- The Coral Gables page earns its existence with content a generic template cannot produce: pre-1940 plaster-over-hollow-tile walls that are nowhere near square, Board of Architects review sitting on the permit critical path, Mediterranean-revival profile matching, Gables By The Sea salt exposure, downtown condo elevator scheduling. That is the bar. **A city page that could have its city name swapped without changing a sentence should be deleted, not rewritten.** On that test, most of the 25 should be consolidated into the county hubs.

### 6. Titles and metadata

Standardised on one brand string — **Delta Woodworks** — keyword-first, all ≤60 characters, resolving the three competing suffixes the audit found:

| Page | Title |
|---|---|
| Home | `Custom Kitchen Cabinets Fort Lauderdale \| Delta Woodworks` |
| Kitchens | `Custom Kitchen Cabinets — Designed & Milled In-House \| Delta Woodworks` |
| Pricing | `What Custom Kitchen Cabinets Cost in South Florida \| Delta Woodworks` |
| Coral Gables | `Custom Kitchen Cabinets in Coral Gables, FL \| Delta Woodworks` |

Deliberately non-overlapping intents: the homepage takes the geo money term, the service page takes the non-geo design/build term, pricing takes cost intent, the location page takes its own city. No two pages compete.

### 7. Schema

`HomeAndConstructionBusiness` with canonical NAP, hours, `areaServed` and `sameAs`; `FAQPage` on home and pricing; `Service` and `BreadcrumbList` on interior pages. All blocks validate as JSON. The one thing missing is `AggregateRating` — which cannot be faked, and which is exactly why the review engine is priority zero.

---

## What is real and what is placeholder

| Element | Status |
|---|---|
| Copy | Production-ready. Written from Delta's own published claims. |
| Markup, CSS, schema | Production-ready. Responsive, light/dark, keyboard-accessible, no horizontal overflow at 390/768/1440. |
| NAP, hours, socials | Real, using the **954** number as canonical per the audit's NAP recommendation. |
| Two client quotes | Real fragments already published about Delta. The third is representative filler and must be replaced. |
| **Pricing ranges** | **Placeholder.** Derived from published 2026 South Florida market data ($500–$1,500+/linear foot installed; South Florida runs 15–25% above Central Florida). Replace before publishing. |
| **All photography** | **Placeholder.** Every frame carries the specific shot it needs — the frames double as a shoot brief. |

### The photography brief, in priority order

The mill is the entire positioning, and there is currently no way to see it. In rough order of value:

1. **Hero (vertical):** mill floor mid-run — a walnut door blank on the CNC, sawdust in raking afternoon light, a founder in frame. Not a stock kitchen. This one image carries the argument.
2. **Materials detail:** a drawer box on a Blum runner, dovetails visible, beside a cut edge of Columbia Forest plywood showing ply count.
3. **Stock vs. custom:** a scribed Delta box against a wall, next to a stock box with a visible filler strip.
4. **Portfolio, captioned by neighbourhood + species + door style** — "Rio Vista — white oak island, painted perimeter". Captions are what make a portfolio rank locally.
5. **Local proof for each location page** — recognisable context in frame (barrel-tile roofline, arched opening, Dade County pine floors).

---

## What this does not fix

The redesign is worth less than the review engine. From the audit, unchanged and still priority zero:

1. **Unify the phone number.** Two are in the wild — (954) 939-8579 and (786) 614-0917. Inconsistent NAP directly suppresses local-pack ranking.
2. **Claim and work the Google Business Profile.** Category "Cabinet maker", 30+ photos, monthly posts, and a review ask at every final walkthrough. Target 2–4 new reviews/month.
3. **Create a Houzz profile.** It does not exist. Competitors are winning there by default.
4. **Fix the Yelp listing** (`delta-woodworks-no-title`) and merge the duplicate D&B profiles.

A shop with 30 Google reviews and this positioning beats a shop with this positioning alone.

---

## Implementation notes

The mockup is static HTML/CSS with no build dependencies and no JavaScript on the pages themselves. For the existing WordPress site there are two routes:

- **Block theme / theme.json** — the palette, type scale and spacing tokens in `site/assets/styles.css` map cleanly onto `theme.json` settings. The comparison table, tiers, steps and FAQ are the four patterns worth registering as reusable blocks.
- **Page-builder rebuild** — treat the mockup as a visual spec and rebuild section by section. Slower, but does not touch the theme.

Either way the SEO work (titles, canonical structure, schema, the 301 of the Fort Lauderdale city page) is independent of the visual rebuild and can ship first — it is worth more, sooner.

---

## Sources

- [The Kitchenworks — custom cabinetry](https://thekitchenworks.com/custom-cabinetry/) · [Houzz profile](https://www.houzz.com/professionals/cabinets-and-cabinetry/the-kitchenworks-pfvwus-pf~1258529026) · [Yelp](https://www.yelp.com/biz/the-kitchenworks-fort-lauderdale)
- [OC Architectural Woodwork](https://www.ocwoodart.com/) · [Houzz profile](https://www.houzz.com/professionals/kitchen-and-bath-remodelers/oc-architectural-woodwork-pfvwus-pf~665405560)
- [Broward Custom Kitchens](https://browardcustomkitchens.com/) · [Houzz profile](https://www.houzz.com/professionals/kitchen-and-bath-designers/broward-custom-kitchens-inc-pfvwus-pf~1988326960)
- [D'Cassa — Fort Lauderdale](https://dcassa.com/fort-lauderdale-custom-kitchen-cabinets-designers/)
- [LIOHER — Fort Lauderdale](https://lioher.com/area/fort-lauderdale-fl/) · [Cabinet IQ — Fort Lauderdale](https://cabinetiq.com/fort-lauderdale/cabinets/)
- [Houzz — custom cabinet makers, Fort Lauderdale](https://www.houzz.com/professionals/cabinets/fort-lauderdale-fl-us-probr0-bo~t_11829~r_4155966)
- [Delta Woodworks — About](https://deltawoodworksfl.com/about-us/) · [Delta Woodworks — Yelp](https://www.yelp.com/biz/delta-woodworks-no-title)
- Cost data: [Miami custom kitchen cabinets 2026](https://fabsremodeling.com/miami-custom-kitchen-cabinets/) · [Palm Beach custom cabinet cost 2026](https://www.palmclubdesigngroup.com/blogs/cost-of-custom-cabinets) · [Custom cabinet cost 2026](https://marfacabinets.com/blog/how-much-do-custom-kitchen-cabinets-cost-2026/)
