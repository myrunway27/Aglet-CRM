# Infinity Development — infdev.dev

One-page site for Infinity Development. Static HTML, no framework, no dependencies. All copy lives in `content.json`.

Built to the same skeleton as the reference site **yarintech.uk**: six numbered sections down a teal spine, alternating dark and light bands. All copy is original — nothing is reproduced from their site, and the logo mark is deliberately different (a lemniscate, not their two-ring mark).

| # | Section | Band |
|---|---|---|
| 01 | Hero | dark, full-bleed photo |
| 02 | Our services | dark, five numbered photo cards |
| 03 | Advantages | light, eight icon cards |
| 04 | Benefits | dark, six numbered items with teal label bars |
| 05 | Design & Marketing | light, three photo cards plus one wide |
| 06 | Contact us | dark |

## Run it locally

```bash
node build.mjs
npx serve dist          # → http://localhost:3000
```

Node 18+ is the only requirement. There is nothing to `npm install`.

## Change the words

Everything readable on the page is in **`content.json`**. Edit it, run `node build.mjs`, refresh. Colours and fonts are the `:root` block at the top of `assets/styles.css` — teal is `--teal`.

## Put it online

**Fastest — about 30 seconds:** drag the `dist` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).

**GitHub Pages — free, redeploys on every push.** The workflow is committed. Turn it on: repo → **Settings** → **Pages** → **Source: GitHub Actions**. Lands at `https://myrunway27.github.io/Aglet-CRM/`.

**Cloudflare Pages or Vercel — best for the real domain.** Connect the repo, then:

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

## Before launch: photography

**This design is photo-led — it is not finished until real images are in it.** Every frame currently shows a placeholder with the shot it needs written underneath, so the mockup doubles as a shoot brief. Eleven images in total:

- **01 Hero** — wide shot of the team at work, dark enough to carry white type across the upper half
- **02 Services** ×5 — keyboard/desk, data centre corridor, circuit board macro, abstract AI visual, operations desk
- **05 Design & Marketing** ×4 — analytics desk, sticky-note workshop, colour swatches, and a wide client-meeting banner

Commission them, or licence from a stock library — but replace them. Placeholder frames on a live site read worse than a simpler design would.

There are no invented clients, testimonials or statistics anywhere on the site.

## Structure

```
content.json        all copy — the only file most edits touch
assets/styles.css   design tokens and components
build.mjs           renders content.json → dist/ and preview.html
dist/               built site; this is what gets deployed
preview.html        single-file build, published as a shareable Artifact
```
