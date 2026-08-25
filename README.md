# Infinity Development — infdev.dev

One-page site for Infinity Development. Static HTML, no framework, no dependencies. All copy lives in `content.json`.

## Run it locally

```bash
node build.mjs
npx serve dist          # → http://localhost:3000
```

Node 18+ is the only requirement. There is nothing to `npm install`.

## Change the words

Everything readable on the page is in **`content.json`** — headline, services, approach, tech stack, footer. Edit it, run `node build.mjs`, refresh.

Colours and fonts are the `:root` block at the top of `assets/styles.css`.

## Put it online

**Fastest — about 30 seconds:** drag the `dist` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Live URL immediately.

**GitHub Pages — free, redeploys on every push.** The workflow is already committed. Turn it on:

1. Repo → **Settings** → **Pages**
2. **Source** → **GitHub Actions**

Lands at `https://myrunway27.github.io/Aglet-CRM/`. Asset paths are relative, so the subdirectory works unchanged.

**Cloudflare Pages or Vercel — best for the real domain.** Connect the repo and set:

| Setting | Value |
|---|---|
| Build command | `node build.mjs` |
| Output directory | `dist` |
| Node version | 20 |

### Pointing infdev.dev at it

Add the domain in the host's dashboard, then at your registrar:

- `www.infdev.dev` → `CNAME` to the host's target
- `infdev.dev` (apex) → the host's ALIAS/ANAME record, **not** a plain `CNAME` — that is invalid at the apex

HTTPS is issued automatically by all three hosts.

## Replace before launch

Two blocks are placeholder and say so on the page:

- **Work** — three dummy project cards. Replace with real projects. Do not publish invented case studies or client names.
- **Tech stack** — a plausible default list. Replace with what your team actually uses.

There are no invented testimonials, client logos, or statistics anywhere on the site — a new company cannot evidence them, and fabricating them is a liability rather than a shortcut.

## Structure

```
content.json        all copy — the only file most edits touch
assets/styles.css   design tokens and components
build.mjs           renders content.json → dist/ and preview.html
dist/               built site; this is what gets deployed
preview.html        single-file build, published as a shareable Artifact
```

## Reference

Built to the same skeleton as yarintech.uk — an IT-solutions one-pager covering software, cloud, AI, web, IoT, UI/UX and branding. All copy here is original; nothing is reproduced from their site.
