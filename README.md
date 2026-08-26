# Advantage Corp — MCA Landing Page

A single-file landing page for Advantage Corp, a merchant cash advance (MCA) business funding company.

## Structure

Everything lives in `index.html` — HTML, CSS, and JavaScript are embedded, with no build step or dependencies (the only external resource is Google Fonts). It can be deployed as-is to any static host (GitHub Pages, Netlify, Vercel, S3, etc.).

## Sections

- Hero with a quick-quote application form
- Trust/stats strip
- How It Works (3 steps)
- Why Advantage Corp (benefits)
- Do I Qualify? + Merchant Cash Advance program terms
- Industries served
- Testimonials
- FAQ accordion
- Final CTA and footer with MCA disclosure

## Before going live

All content is placeholder marketing copy created for this build. Replace before launch:

- **Phone number** `(888) 555-0147` and email `funding@advantagecorp.com` — swap for real contact details (they appear in the top bar, header, hero form success message, CTA band, and footer).
- **Stats** ($750M+ funded, 12,000+ businesses, 4.9/5 rating) and **testimonials** — replace with real, substantiable figures and reviews.
- **Program terms** (funding range, factor rates, terms) — align with your actual offerings.
- **Form submission** — the quote form is front-end only. Wire the `submit` handler at the bottom of `index.html` to your CRM or a form endpoint.
- **Privacy Policy / Terms of Service** links in the footer point to `#` and need real pages.
- Have counsel review the footer disclosure and all marketing claims for your jurisdictions.
