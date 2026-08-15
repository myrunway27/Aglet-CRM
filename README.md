# SFLA Tribute & Cover Tracker

Tracks tribute and cover band shows at live music venues from Miami to Boca
Raton — **real data only**, copied verbatim from each venue's own website by a
deterministic script. No AI is involved in producing the data, so nothing can
be projected or hallucinated: a show appears only if the venue's page contains
it, and every show keeps the URL it came from plus its fetch timestamp.

## How it works

```
scripts/refresh.mjs  ──fetches──►  venue websites (their own listings)
        │
        └──writes──►  data/shows.json  ──read by──►  sfla-tribute-tracker.jsx
```

- **`scripts/refresh.mjs`** — fetches each venue's official calendar page and
  extracts events from its schema.org JSON-LD markup (what venues publish for
  Google), falling back to a linked `.ics` feed. Past events are dropped;
  failures are recorded per venue as failures, never guessed at.
  Needs Node 18+, no dependencies.
- **`data/shows.json`** — the generated data: shows plus per-venue fetch
  status (`ok` / `error` / `no-structured-data`) and timestamps.
- **`sfla-tribute-tracker.jsx`** — display-only React component. Renders the
  JSON night by night with city and tribute filters, and shows each venue's
  fetch status honestly, including errors. The "tribute" tag appears only when
  the listing text literally contains a tribute phrase, and the tag's tooltip
  shows that exact phrase as evidence.

## Refreshing

```sh
node scripts/refresh.mjs                 # all venues
node scripts/refresh.mjs funky-biscuit   # just one
node scripts/refresh.mjs --test <url>    # dry-run the parser on any URL
```

Note: the committed `data/shows.json` was generated in a sandboxed environment
that blocks outbound requests to venue sites, so it records an HTTP 403 for
every venue and zero shows — which the app displays as exactly that. Run the
refresh from a normal network to populate real listings. The parser itself is
tested (JSON-LD and ICS paths) against fixtures.

## Venues (12)

Boca Raton: Funky Biscuit, Crazy Uncle Mike's, Boca Black Box, Barrel of Monks.
Delray Beach: Tin Roof. Fort Lauderdale/Oakland Park: Revolution Live, Tin
Roof, Tarpon River Brewing, Funky Buddha. Miami: Ball & Chain, Lagniappe,
Churchill's Pub. Venue list lives in `scripts/refresh.mjs`.
