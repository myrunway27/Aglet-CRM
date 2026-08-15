# SFLA Tribute & Cover Tracker

A single-file React app (`sfla-tribute-tracker.jsx`) tracking tribute and cover
band shows at live music venues from Miami to Boca Raton.

## Data integrity policy

Every show listed must be verified against the venue's **official calendar or
ticketing page**, and carries the source URL and the date it was verified.
No inferred, recurring-by-assumption, or placeholder shows are ever included.

The app includes a coverage-transparency layer so it's always visible what has
and hasn't been checked:

- a banner counting venues that are fully checked / partially checked / not audited
- a per-venue coverage panel with tap-through links to each official calendar
- per-show warnings when a listing has any caveat

## Current state (build 2026-08-15)

This build was produced in an environment whose network policy blocks direct
access to venue websites, so **no shows are pre-loaded** — the show list is
empty rather than unverifiable. The 12-venue registry (Boca Raton, Delray
Beach, Fort Lauderdale/Oakland Park, Miami) is in place with official calendar
links, and the `SHOWS` array documents the exact shape for adding verified
entries.
