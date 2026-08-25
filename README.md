# Aglet — marketing site

Static marketing site for **Aglet**, job software for custom cabinet and millwork shops. One page, no framework, no runtime dependencies. All copy lives in `content.json`.

## Getting it up and running

### 1. Look at it locally

```bash
node build.mjs
npx serve dist          # → http://localhost:3000
```

Or just open `dist/index.html` in a browser. Node 18+ is the only requirement; there is nothing to `npm install`.

### 2. Change the words

Everything readable on the page — headline, features, pricing, FAQ, footer — is in **`content.json`**. Edit it, run `node build.mjs`, refresh. No HTML or CSS editing required.

> **If the product or industry is wrong**, `content.json` is the only file you need to rewrite. The build script and stylesheet make no assumptions about what the product is.

Design tokens (colour, type, spacing) are the `:root` block at the top of `assets/styles.css`.

### 3. Put it on the internet

Three routes, fastest first.

**Netlify drop — about 30 seconds, no account setup**
Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the `dist` folder onto the page. You get a live URL immediately. Good for showing someone today.

**GitHub Pages — free, deploys on every push**
A workflow is already committed at `.github/workflows/deploy.yml`. To turn it on:

1. Repo → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to this branch (or Actions → *Deploy site* → **Run workflow**)

Your site lands at `https://myrunway27.github.io/Aglet-CRM/`. Asset paths are relative, so the subdirectory works without changes.

**Cloudflare Pages or Vercel — free, custom domain, best long-term**
Connect the repo and set:

| Setting | Value |
|---|---|
| Build command | `node build.mjs` |
| Output directory | `dist` |
| Node version | 20 |

### 4. Point a domain at it

Whichever host you pick, add the domain in its dashboard, then at your registrar create a `CNAME` for `www` pointing at the host's target. HTTPS is automatic on all three. If you use the apex domain (no `www`), use the host's ALIAS/ANAME record instead — a plain `CNAME` is not valid at the apex.

## Replace before launch

Three things are deliberately placeholder and are flagged in the page itself:

- **Pricing** — `$49 / $149 / $349` are invented. Set real numbers in `content.json` → `pricing.tiers`.
- **Testimonial** — currently a note telling you not to publish an invented quote. Replace with a real one from a pilot shop, or delete the section.
- **Comparison table** — compares by *category* (spreadsheets / general CRM / construction PM suite) rather than naming competitors, because specific competitors' feature sets were not verified. Verify before naming anyone.

Also: `meta.url` in `content.json` is set to `https://aglet.app/`. Change it to the real domain so the canonical tag and Open Graph URLs are correct.

## Layout

```
content.json          all site copy — the only file most edits touch
assets/styles.css     design system (tokens at the top)
build.mjs             renders content.json → dist/ and preview.html
dist/                 built site, deploy this
preview.html          single-file build, published as a shareable Artifact
```

`dist/` and `preview.html` are build output but are committed so the site can be deployed straight from a clone without a build step.
