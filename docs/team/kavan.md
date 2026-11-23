# Pavan — Marine forecasts and satellite observations

## Outcome and ownership

Provide trustworthy marine measurements at the user's selected water location, reusing existing `backend/app/data/weather/`, marine services/routes, provider health, `frontend/src/lib/orca/marine.ts` and API types. Own provider adapters and field contracts; coordinate cache internals with Prachi and map layer APIs with Harpal.

## Build in order

1. Inventory existing Open-Meteo and INCOIS paths; do not build a second competing forecast stack. Create a field matrix for wave height, direction, period, wind-wave and swell components, wind speed/direction, SST, current speed/direction and chlorophyll. Distinguish wave period from speed; any derived phase speed needs a documented physical model and must be labelled derived.
2. Verify Open-Meteo Marine requests for mainland India, Lakshadweep, Andaman, Nicobar, Rameswaram and Kanyakumari. Preserve model run/valid time, units, sampled grid coordinate, resolution and missing values. Coastal interpolation is a model result, not a buoy reading. Verify commercial-use requirements before beta launch.
3. Investigate chlorophyll separately: Copernicus ocean-colour NRT and MOSDAC dataset downloads are candidates. MOSDAC point ingestion is currently not implemented; credentials alone do not enable it. Select a real dataset, ingest bounded geographic/time subsets, retain observation date, cloud/quality masks, fill values, spatial resolution and licensing. Never return zero for cloud or missing coverage.
4. Compare tide candidates against India station coverage and datum. NOAA station products are US-oriented; Open Waters advertises global harmonic predictions but actual Indian coverage must be tested. Do not turn model water level into a port-specific tide clearance claim.
5. Use bounded timeouts, retries with backoff, circuit breaking and sanitized provider errors. Partial outages must retain available fields with their individual provenance rather than marking the whole payload live.

## Interface and acceptance

Propose additive per-field metadata: value/null, unit, source, observation/forecast valid time, retrieved time, quality and live/cached/stale/unavailable mode. Confirm schema with Darshil before migration. Verify exact units and current-slot selection, null/NaN handling, timezone rollover, rate limits, timeout and mixed-provider ages. Render real and unavailable fields on a phone-sized dashboard. Deliver source/license links, recorded sanitized live probes and realistic expected update cadence.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
