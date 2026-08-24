# Delta Woodworks — competitor-informed site redesign

A redesign of **deltawoodworksfl.com** built around one positioning wedge: almost every cabinet company in South Florida is a dealer or a showroom, and Delta owns the mill.

Follows on from the SEO audit on branch `claude/website-seo-optimization-jle39k`.

## What's here

| Path | What it is |
|---|---|
| `competitor-teardown.md` | The research, the market map, and the rationale for every design decision. **Read this first.** |
| `site/index.html` | Redesigned homepage. Hand-authored, and the source of the shared header/footer. |
| `site/services/custom-kitchens.html` | Service page template — non-geo, design/build intent. |
| `site/pricing.html` | Pricing page. The gap no competitor fills. |
| `site/locations/coral-gables.html` | Location page template — the anti-doorway-page model. |
| `site/assets/styles.css` | The design system. Tokens, components, light/dark. |
| `scripts/build-site.mjs` | Composes the interior pages from the chrome in `index.html`. |
| `scripts/build-preview.mjs` | Flattens all four pages into `preview.html`. |
| `preview.html` | Single-file preview with a page switcher — generated, published as the shareable artifact. |

## Building

No dependencies. Node 18+.

```bash
node scripts/build-site.mjs      # regenerate the interior pages
node scripts/build-preview.mjs   # regenerate preview.html
```

`site/index.html` is the only hand-edited page. The header, footer, utility bar and icon sprite live there and are pulled into the other pages at build time, so the chrome cannot drift. Edit `index.html`, then rebuild.

To view the real multi-page site locally:

```bash
npx http-server site -p 8080
```

## Verified

Rendered in Chromium at 390 / 768 / 1440 px, light and dark:

- No horizontal overflow at any breakpoint
- No JavaScript errors
- All internal links resolve
- All JSON-LD blocks parse

## Before this goes live

Two things in the mockup are deliberately not real, and both are flagged in-page:

- **Pricing ranges** are market-derived placeholders. Replace with Delta's actual numbers.
- **All photography** is placeholder. Each frame carries the shot it needs — the frames double as a shoot brief. See the photography section of the teardown.

One client quote in the reviews section is representative filler; the other two are real published fragments.

## The part that matters more than the redesign

From the audit, still unaddressed and still higher-return than anything in this branch: unify the two phone numbers in circulation, claim and work the Google Business Profile, create a Houzz profile, fix the `delta-woodworks-no-title` Yelp listing. A shop with 30 Google reviews and this positioning beats a shop with this positioning alone.
