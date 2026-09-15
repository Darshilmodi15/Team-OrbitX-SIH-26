# Prachi — Shared cache and offline trip packs

## Outcome and ownership

Reduce repeated public-provider requests and let users read deliberately saved trip information without a connection. Own Redis integration/cache orchestration and offline-pack storage/service-worker files. Existing `backend/app/data/weather/cache.py` already has Redis support and memory fallback; extend it rather than assuming no cache exists. Coordinate keys/schema with Pavan and Darshil, shell integration with Heth/Rajvi.

## Build in order

1. Verify Redis from the running backend environment. A private provider hostname may not resolve on a laptop. Configure an appropriate endpoint/TLS/access policy through secrets; no raw URL/password in logs or health responses. Local fallback must be explicit in operations status and not called shared Redis.
2. Share only public provider payloads by provider/product/version, justified grid cell, forecast time or publication, and language/sector when relevant. Do not cache personalized final API responses under only coordinates. Private profile, location, chat, auth and SOS require account isolation or must not enter this cache.
3. Bound TTL by actual validity, preserve source/retrieval timestamps, prevent stampedes across workers, handle corrupt entries/timeouts/restarts and cap memory. Never reset issue time on cache read. Measure cold/warm latency and upstream calls across two independent workers/users at a public location.
4. Build an explicit “save trip pack” flow with manifest, download progress, source/validity, selected region, permitted assets, storage budget, deletion and account ownership. Use versioned local storage/IndexedDB and service-worker shell caching only where appropriate. Honor provider map tile terms; do not bulk download tiles by assumption.
5. Handle interrupted save atomically, quota/denied storage, logout, schema upgrades and airplane mode after restart. Expired saved data stays visibly expired. An offline SOS may be queued only with explicit queued-not-delivered status; do not auto-replay dangerous or duplicate actions.

## Acceptance

Real Redis round-trip and reuse across separate processes, outage fallback, TTL/expiry, poisoned/cross-user cache regressions, measured cache benefit, browser restart in airplane mode, expiry while offline, interrupted download and pack deletion. Show exactly which assets are offline-capable and which require connection. Deliver deployment secret names and safe health/runbook steps.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
