# SEO & Growth Audit — deltawoodworksfl.com

**Business:** Delta Woodworks LLC — custom cabinetry shop & showroom
**Location:** 2416 S Andrews Ave, Fort Lauderdale, FL 33316
**Audit date:** August 23, 2026
**Method:** Search-index analysis (Google/Bing indexed pages, titles, snippets, citations, competitor SERPs). Direct crawling was not possible from this environment, so a short list of "verify yourself" checks is included at the end.

---

## Executive summary

The good news: the site is indexed, has real content depth (a blog, an FAQ, service pages, ~25 city landing pages), and the business has genuinely strong raw material — in-house mill, made-in-USA, 3D design process, 4–8 week turnaround, veteran founders. That's more than most local competitors have.

The problems fall into four buckets, in order of impact:

1. **Local SEO foundation is leaking.** Two different phone numbers circulate in citations, the Google Business Profile footprint is weak (no rating/review presence surfaces in search), and the single most important directory for this trade — **Houzz** — has no profile. For a business selling $20k+ kitchen projects, reviews and local-pack visibility are worth more than everything else in this report combined.
2. **Title tags are inconsistent and half-configured.** Three different brand suffixes are live ("Delta Woodworks", "Delta Woodworks Cabinets", "Delta Woodworks FL"), and many pages still use the WordPress default `Page Name - Site Title` pattern with no keywords ("Services", "Gallery", "Florida Cabinets").
3. **Keyword cannibalization + doorway-page risk.** Two live pages target Boca Raton with near-identical intent; the homepage and the Fort Lauderdale city page compete with each other; and ~25 thin city pages (including tiny markets like El Portal and Florida City) match the pattern Google's spam policy calls "doorway pages."
4. **Hygiene bugs that signal neglect to crawlers:** a malformed indexed URL (`/https-deltawoodworksfl-com-bathroom-design/`), a typo'd slug (`/did-you-know-we-have-our-own-mil/`), inconsistent trailing slashes, and duplicate Dun & Bradstreet company profiles.

---

## 1. What's already working (keep doing this)

- **Indexed and crawlable.** Google has the homepage, all core pages, the location pages, and the blog.
- **Location-page strategy exists.** ~25 city pages across Broward, Miami-Dade, and Palm Beach counties. The skeleton is right; the execution needs differentiation (see §4).
- **A real blog** with ~15 posts, several well-targeted at Florida-specific intent ("The Florida Outdoor Kitchen: Selecting Weather-Proof Cabinetry", "Ultimate Guide to Choosing Wood Species for Your Florida Home", "How to Prepare for a Custom Cabinet Installation").
- **Some SEO-plugin usage.** Several pages have hand-written titles ("Plan a Custom Woodworking Budget | Delta Woodworks FL", "Top Kitchen Cabinet Design Mistakes to Avoid"), which means Yoast/RankMath (or similar) is installed — it's just not applied everywhere.
- **Press syndication.** An EIN Presswire release landed on 8newsnow.com and woodworkingnetwork.com — real, if modest, backlinks.
- **Strong differentiators already articulated on-site:** own mill / nothing imported, 3D modeling before fabrication, Columbia Forest plywood + Blum soft-close hardware, 4–8 week turnaround, residential + commercial, veteran founders.

---

## 2. Priority 0 — Local SEO foundation (highest ROI, do first)

For "custom kitchen cabinets fort lauderdale" and every "near me" query, the **map pack appears above organic results**. This is where the money is.

### 2.1 Unify NAP (Name / Address / Phone) — there are two phone numbers in the wild
- **(954) 939-8579** — appears with the website's own contact info.
- **(786) 614-0917** — appears on Yelp and SouthFloridaContractors.com.

Pick ONE canonical number (recommend the 954 number — it matches the Fort Lauderdale market), then update every citation: Google Business Profile, Yelp, Facebook, Instagram bio, Pinterest, Procore, D&B, South Florida Contractors, and the website footer/contact page. Inconsistent NAP directly suppresses local-pack rankings. If the 786 number must stay live for tracking, use it only as a secondary/tracking line, never as the listed business number.

### 2.2 Google Business Profile (GBP) — claim, complete, and work it
No rating or review count surfaces in branded searches, which for a 25-year business usually means the profile is unclaimed, thin, or review-starved. Checklist:
- Claim/verify the profile for "Delta Woodworks" at 2416 S Andrews Ave.
- Primary category: **Cabinet maker**. Secondary: Cabinet store, Woodworker, Kitchen remodeler, Carpenter.
- Add: hours (M–Th 9–6, F 9–5), the 954 phone, website link, 30+ photos (showroom, mill, installs — geotagged project photos are ideal), services list, and the veteran-founded attribute if applicable.
- Post monthly (finished projects work well as GBP posts).
- **Reviews engine:** ask every completed client for a Google review with a direct review link (QR card at final walkthrough + follow-up text/email). Target: 2–4 new reviews/month. Respond to every review. This is the single highest-leverage action in this entire document — competitors like The Kitchenworks ("35 years, award-winning") are winning the trust battle in SERPs right now.
- Also create/claim: **Bing Places** and **Apple Maps** (Apple Business Connect) — free and 10 minutes each.

### 2.3 Houzz — the missing platform
Houzz is where South Florida homeowners and designers actually shop for cabinet makers, and there is no Delta Woodworks profile. Create one, upload the portfolio with keyword-rich project titles ("White shaker custom kitchen — Coral Gables"), and route a few happy clients there for reviews. Houzz profiles also rank organically for "[trade] + [city]" queries, so this doubles as a SERP-share play.

### 2.4 Citation cleanup
- **Duplicate Dun & Bradstreet profiles** — two separate D&B company-profile URLs exist for Delta Woodworks LLC. Request a merge via D-U-N-S support (duplicates fragment the citation graph).
- **Yelp listing** lives at the slug `delta-woodworks-no-title` — claim the listing, fix the business name/details, add photos, and correct the phone number.
- Add the remaining free, high-authority citations: BBB, Angi, Thumbtack, Nextdoor (neighborhood word-of-mouth is huge for this trade), Porch, BuildZoom.

### 2.5 Social profile consistency
- Instagram: @deltawoodworksfl (315 followers) • Facebook: /deltawoodworksfl (335 likes) • Pinterest: **fldeltawoodworks** ← different handle. Rename Pinterest to match, put the canonical NAP + site link in every bio, and cross-link all profiles from the site footer (these become `sameAs` entries in schema — §5).

---

## 3. Priority 1 — Title tags & metadata overhaul

Three brand suffixes are live simultaneously, and utility pages ship keyword-empty defaults. Pick **one** brand string — recommend **"Delta Woodworks"** — and rewrite every title keyword-first. Current state, from Google's index:

| Page | Current title | Problem |
|---|---|---|
| Homepage | `Delta Woodworks \| Fort Lauderdale FL \| Custom Kitchens` | Brand first (wastes the highest-value slot); "Custom Kitchens" isn't the money term ("custom kitchen **cabinets**" is) |
| City pages | `Custom Kitchen Cabinets X \| Delta Woodworks` | Good pattern — the one to standardize on |
| /services/ | `Services - Delta Woodworks Cabinets` | WP default, zero keywords |
| /gallery/ | `Gallery - Delta Woodworks Cabinets` | WP default, zero keywords |
| /florida-cabinets/ | `Florida Cabinets - Delta Woodworks Cabinets` | Vague target, competes with everything |
| /contact-us | `Contact Us - Delta Woodworks Cabinets` | No location/CTA |
| Many blog posts | `Long Sentence Title - Delta Woodworks Cabinets` | Truncated in SERPs |

### Recommended rewrites (all ≤60 chars)

| Page | Proposed title |
|---|---|
| Homepage | `Custom Kitchen Cabinets Fort Lauderdale \| Delta Woodworks` |
| /services/ | `Custom Cabinetry Services \| Delta Woodworks Fort Lauderdale` |
| /gallery/ | `Custom Cabinet Project Gallery \| Delta Woodworks` |
| /about-us/ | `About Delta Woodworks \| Veteran-Founded Cabinet Shop` |
| /contact-us | `Free Estimate \| Delta Woodworks, Fort Lauderdale FL` |
| /frequently-asked-questions/ | `Custom Cabinet FAQs \| Delta Woodworks` |
| City pages | `Custom Kitchen Cabinets {City}, FL \| Delta Woodworks` |
| Blog posts | Keyword-first, ≤60 chars, suffix `\| Delta Woodworks` |

**Meta descriptions:** write one per money page (150–160 chars) that includes the differentiators buyers care about: *"Custom kitchen cabinets built in our own Fort Lauderdale mill. 3D design preview, Blum hardware, 4–8 week turnaround. Free estimate: (954) 939-8579."* — that phone number in the SERP snippet generates calls before the click.

**H1s:** one per page, matching the title's target phrase (e.g., homepage H1: "Custom Kitchen Cabinets in Fort Lauderdale, Built in Our Own Mill").

---

## 4. Priority 1 — Fix cannibalization; Priority 2 — restructure city pages

### 4.1 Direct cannibalization (fix now)
- **Boca Raton ×2:** `/custom-kitchen-cabinets-boca-raton/` AND `/kitchen-cabinets-boca-raton-fl/` target the same query. Keep the stronger one (check clicks in Search Console), merge content, **301-redirect** the other.
- **Fort Lauderdale vs homepage:** the homepage and `/custom-kitchen-cabinets-fort-lauderdale/` compete for the exact same home-market query. Recommended: 301 the city page into the homepage and make the homepage explicitly the Fort Lauderdale page (title above). Alternative: keep both but re-target the homepage to the broader "custom cabinets South Florida" and let the city page own Fort Lauderdale — pick one, don't run both against each other.
- **/florida-cabinets/** is a vague statewide page that overlaps every city page. Re-target it as the **Service Areas hub** ("Custom Cabinets Across South Florida — Broward, Miami-Dade & Palm Beach") linking to every city page, or 301 it to /services/.
- **Slug-pattern split:** most cities use `custom-kitchen-cabinets-{city}` but Coral Gables and Coconut Grove use `kitchen-cabinets-{city}`. Harmless for ranking by itself, but standardize the pattern for any *new* pages (don't rename existing ranking URLs without 301s).

### 4.2 Doorway-page risk (structural)
~25 near-identical city pages — including micro-markets like El Portal, Florida City, West Miami, Miami Shores, Lauderdale Lakes — is the exact pattern Google's spam policies describe as doorway pages. Sites get away with it until a core update decides they don't. Two-part fix:

1. **Prune to markets that matter.** Keep ~8–10 pages for real target markets (Miami, Miami Beach, Coral Gables, Boca Raton, Hollywood, Pompano Beach, Plantation, West Palm Beach / Palm Beach Gardens). 301 the micro-market pages into the Service Areas hub.
2. **Differentiate every survivor** so it earns its ranking: 2–3 photos of actual projects *in that city*, a testimonial from a client there, city-specific copy (building styles, condo vs. single-family considerations, HOA/permit notes), distance/drive time from the Fort Lauderdale showroom, and an embedded map. A city page with a real local project gallery converts and ranks; a find-and-replace template does neither.

### 4.3 URL hygiene bugs
- **`/https-deltawoodworksfl-com-bathroom-design/`** — a full URL was pasted into the WordPress slug field, and this malformed URL is *indexed*. Rename to `/bathroom-design/` (or fold into a vanities service page) and 301 the old slug.
- **`/did-you-know-we-have-our-own-mil/`** — typo slug ("mil"). Low priority, but if touched, 301 to `/our-own-mill/`.
- **Trailing slashes:** `/contact-us` is indexed without one, everything else with one. Ensure the site 301s to a single canonical form (WordPress default handles this — verify no plugin broke it).
- **www vs non-www:** Google indexes `https://deltawoodworksfl.com` (no www) — you refer to the site as www. Verify `www.` 301-redirects to the bare domain (one hop, https) and that all canonicals point to the bare domain.

---

## 5. Priority 1 — Structured data (schema.org)

Nothing in the index suggests rich results are being earned. Add:

**LocalBusiness JSON-LD** (site-wide, in header or via SEO plugin):

```json
{
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "name": "Delta Woodworks",
  "description": "Custom kitchen cabinets, closets, vanities, wall units and commercial cabinetry, designed and built in our own Fort Lauderdale mill.",
  "url": "https://deltawoodworksfl.com/",
  "telephone": "+19549398579",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "2416 S Andrews Ave",
    "addressLocality": "Fort Lauderdale",
    "addressRegion": "FL",
    "postalCode": "33316",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 26.0937, "longitude": -80.1418 },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday"], "opens": "09:00", "closes": "18:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "09:00", "closes": "17:00" }
  ],
  "priceRange": "$$$",
  "image": "https://deltawoodworksfl.com/<showroom-or-project-photo>.jpg",
  "sameAs": [
    "https://www.facebook.com/deltawoodworksfl/",
    "https://www.instagram.com/deltawoodworksfl/",
    "https://www.pinterest.com/fldeltawoodworks/",
    "https://www.yelp.com/biz/delta-woodworks-no-title"
  ],
  "areaServed": ["Fort Lauderdale FL", "Miami FL", "Boca Raton FL", "Hollywood FL", "Pompano Beach FL", "West Palm Beach FL"]
}
```
(Verify the exact lat/long; use the canonical phone from §2.1.)

- **FAQPage schema** on `/frequently-asked-questions/` — the Q&A content already exists; marking it up earns expandable SERP real estate.
- **BreadcrumbList** across service and city pages.
- Once Google reviews accumulate, consider embedding testimonials on service pages (do **not** mark up third-party reviews with Review schema — against guidelines; GBP reviews surface on their own).
- Validate everything in Google's Rich Results Test.

---

## 6. Priority 2 — Content strategy

The blog is real but scattershot. Redirect the effort toward *buyer-intent* content:

**Retire/deprioritize:** "DIY Woodworking Ideas" — it attracts do-it-yourselfers, the one audience that will never buy custom cabinetry. Everything published should serve someone about to spend $15k–$100k.

**Highest-value gaps (each maps to a real search market):**
1. **Cost content — the biggest one:** "How Much Do Custom Kitchen Cabinets Cost in South Florida? (2026)" with real ranges by project size. Cost queries dominate this niche and almost no local competitor answers them honestly. This page becomes your top-of-funnel magnet.
2. **Outdoor kitchen cabinetry service page.** You already have the blog post; there's clear Florida demand ("outdoor kitchen cabinets Florida", marine-grade, humidity-proof). Promote it from blog post to a full `/services/outdoor-kitchen-cabinets/` page.
3. **Custom vs. semi-custom vs. stock (IKEA/Home Depot) comparison** — the consideration-stage query every buyer runs.
4. **Case studies:** one per major market — "Coral Gables Kitchen Remodel: Before & After" with photos, timeline, materials. These feed the city pages (§4.2), the gallery, GBP posts, and Instagram simultaneously.
5. **Condo cabinetry in high-rises** (elevator logistics, HOA approvals, board requirements) — uniquely South-Florida, zero competition, high intent.

**Gallery upgrade:** rename image files and alt text descriptively (`white-shaker-kitchen-fort-lauderdale.jpg`, alt="White shaker custom kitchen cabinets, Fort Lauderdale waterfront home") — image search is a genuine discovery channel for cabinetry — and organize the gallery by project type + city.

**Tell the founder story.** "Founded by two ex-soldiers" is buried. A proper About page with founder names, faces, and the mill tour (photos/video) is an E-E-A-T signal and a differentiation weapon. If either founder is a U.S. veteran, "veteran-owned cabinet shop" is both a search phrase and a local-news hook.

---

## 7. Priority 2 — Authority & links

Current backlink profile is thin (press-release syndication + directories). Realistic, non-spammy plays for a local shop:

1. **Supplier/partner links:** Columbia Forest Products and Blum both have dealer/partner locators or feature programs — pursue listings. Ask contractor and interior-designer partners for a "trusted partners" link exchange (relevant, local, legitimate).
2. **Local press via the story, not press releases:** veteran founders + own mill + made-in-USA is a genuine Sun-Sentinel / SFBJ / local-TV feature pitch. One real editorial link outweighs every syndicated press release.
3. **Trade associations & chambers:** Greater Fort Lauderdale Chamber, NARI/NKBA South Florida chapters — membership comes with directory links and referral networks.
4. **Houzz/Pinterest as discovery engines** (§2.3) — project photos with keyword titles compound over time.

---

## 8. Performance & UX (verify with tools — couldn't be measured from this environment)

Portfolio-heavy WordPress sites near-universally fail Core Web Vitals on image weight. Run these and fix what they flag:

1. **PageSpeed Insights** (pagespeed.web.dev) on the homepage, one city page, and the gallery — mobile scores are what matter (most cabinet searches are mobile).
2. Expected fixes for a WP portfolio site: serve images as **WebP**, lazy-load below-the-fold, compress hero images under ~200KB, add a caching/optimization plugin (WP Rocket, or the host's), and preload the hero image.
3. **Mobile conversion check:** sticky click-to-call button, tap-to-call phone number in header, estimate form above the fold on mobile. For this business a phone call is the conversion — make the number impossible to miss.
4. **Google Search Console** — if not set up, do it today (verify the bare domain as a Domain property). Then: submit the XML sitemap (Yoast/RankMath generates one at `/sitemap_index.xml` — confirm robots.txt references it), check Coverage for the malformed URLs (§4.3), and use the Performance report to decide the Boca Raton merge (§4.1) and city-page pruning (§4.2) based on actual queries and clicks.
5. **Analytics:** GA4 with call-click and form-submit conversion events, so the SEO work above can be measured in leads, not rankings.

---

## 9. Competitive picture (who you're up against in the SERP)

For "custom kitchen cabinets Fort Lauderdale": **Cabinet IQ** (franchise polish, strong reviews), **Kitchen Tune-Up** (franchise), **The Kitchenworks** ("35 years, award-winning" — winning the authority narrative), **Vision Kitchen Remodeling** (leads with Florida-humidity engineering — smart angle), **R F Wood and Design** (German-precision positioning), **Imperial Cabinets** (waterfront/luxury positioning).

Delta's winnable edge: **the only one with its own mill + 3D preview + 4–8 week turnaround + veteran story**. None of that currently appears in a title tag, meta description, or review corpus where a searcher would meet it. The plan above is largely about surfacing an already-strong offline reputation into the places Google and buyers actually look.

---

## 10. The 30/60/90 plan

**Days 1–30 (foundation):**
- [ ] Claim + fully build GBP; start the review engine (QR card + follow-up SMS)
- [ ] Unify phone number everywhere (§2.1); fix Yelp listing; merge D&B duplicates
- [ ] Create Houzz, Bing Places, Apple Maps profiles
- [ ] Set up Search Console + GA4 with call/form conversions; submit sitemap
- [ ] Fix malformed URL + 301; verify www→non-www redirect
- [ ] Rewrite titles/metas on homepage + 8 money pages (§3)

**Days 31–60 (structure):**
- [ ] Resolve Boca Raton + Fort Lauderdale cannibalization with 301s (use GSC data)
- [ ] Convert /florida-cabinets/ into the Service Areas hub
- [ ] Add LocalBusiness + FAQ schema; validate
- [ ] Publish the cost guide (§6.1) and the outdoor-kitchen service page
- [ ] Differentiate top-5 city pages with real project photos + testimonials

**Days 61–90 (compounding):**
- [ ] Prune/301 micro-market city pages into the hub
- [ ] Publish 2 case studies + condo-cabinetry page
- [ ] Supplier/partner/chamber link outreach; pitch the founder story to local press
- [ ] Performance pass from PSI results; re-test
- [ ] Review month-1 GSC data; iterate titles where CTR is weak

**KPIs to watch monthly:** Google review count & rating, local-pack appearances (track "custom kitchen cabinets + [city]"), GSC clicks on money pages, phone-call + form conversions, Houzz saves/inquiries.

---

## Appendix A — Indexed page inventory found during this audit

**Core:** `/`, `/about-us/`, `/services/`, `/services/custom-wine-storage/`, `/gallery/`, `/contact-us`, `/frequently-asked-questions/`, `/florida-cabinets/`, `/site-map/`

**City pages (custom-kitchen-cabinets-\*):** fort-lauderdale, north-lauderdale, lauderdale-by-the-sea, lauderdale-lakes, pompano-beach, hollywood, plantation, boca-raton, boynton-beach, palm-beach, west-palm-beach, palm-beach-gardens, miami, miami-beach, north-miami, west-miami, miami-shores, miami-lakes, doral, el-portal, florida-city

**Second-pattern location pages:** `/kitchen-cabinets-coral-gables/`, `/kitchen-cabinets-coconut-grove/`, `/kitchen-cabinets-boca-raton-fl/` (duplicate of Boca page), `/bathroom-vanity-miami/`, `/custom-closets-miami/`

**Blog:** wood species guide, wood finish guide, budget planning, journey of custom woodworking, DIY ideas, own-mill post (typo slug), bathroom vanities value, kitchen design mistakes, outdoor kitchen cabinetry, installation prep checklist, restaurant/hospitality cabinets, wine storage, custom kitchen design, closets & mudrooms, wall units & shelving

**Defects:** `/https-deltawoodworksfl-com-bathroom-design/` (malformed, indexed), `/did-you-know-we-have-our-own-mil/` (typo slug)

## Appendix B — Checks to run yourself (blocked from this environment)

1. `https://deltawoodworksfl.com/robots.txt` — confirm it exists, allows crawling, references the XML sitemap
2. `https://deltawoodworksfl.com/sitemap_index.xml` (or `/sitemap.xml`) — confirm it exists and contains only canonical URLs
3. `curl -I https://www.deltawoodworksfl.com` — confirm a single 301 to `https://deltawoodworksfl.com/`
4. PageSpeed Insights on `/`, one city page, `/gallery/` (mobile)
5. Search Console → Indexing → Pages: look for the malformed URLs and soft-404/duplicate warnings on city pages
6. `site:deltawoodworksfl.com` in Google — full indexed inventory; anything embarrassing indexed (tag archives, attachment pages) → noindex
