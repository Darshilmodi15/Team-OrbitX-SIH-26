# Heth — Location selection and access flow

## Outcome and ownership

A user can give GPS location or deliberately select a marine location, and every location-dependent feature uses that validated selection. Own location views, session location state, route gating and location validation/search APIs. Inspect `frontend/src/App.tsx`, location components, session hooks and `POST /api/location/validate` first. Coordinate map picker internals with Harpal; do not change auth/RBAC behavior merely to bypass onboarding.

## Build in order

1. Remove preset demonstration-port shortcuts from required onboarding. Offer current location and manual search/map pin. Keep language/auth/help accessible where appropriate, but gate dashboard/assistant/map analysis on a valid location, including deep links, reload, back button and navbar clicks.
2. GPS permission denial, timeout, unavailable position and poor accuracy need an understandable fallback to manual selection. Show selected coordinates and accuracy where available. Do not claim browser GPS is the user's exact vessel position.
3. A manual home/inland pin must not silently become an ocean point. Explain that marine data requires a coastal/offshore location; offer verified nearby landing centres or a new map pin, then require the user's deliberate selection. Keep selected position separate from provider grid sampling; show the sampling offset when material.
4. Validate mainland and islands, including all Andaman/Nicobar/Lakshadweep groups and Rameswaram/Kanyakumari. Avoid rectangular India bounds as proof of water or jurisdiction. Use a sourced land/coast dataset with a documented tolerance, and clearly handle ambiguous shoreline points.
5. Change location atomically: cancel/ignore old requests and invalidate location-dependent queries. Account switching and logout must clear private location state. Remove duplicate dashboard label/icon only where it adds redundant navigation, preserving accessibility labels.

## Acceptance

Browser tests for GPS denial, manual inland pin, island pin, slow validation, rapid location switching, deep-link assistant before selection, mobile keyboard/search, back/reload and logout/login as another user. No stale previous-location response displayed under a new location. Work with Rajvi on translations and field testing; do not require Google Maps to complete basic location gating.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
