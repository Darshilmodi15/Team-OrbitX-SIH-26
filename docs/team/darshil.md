# Darshil Modi — PFZ and integration lead

## Outcome and ownership

Own the PFZ feed from publication to API to map/text and assistant evidence. Primary files: `backend/app/services/pfz/`, `backend/app/routers/pfz.py`, `backend/app/data/pfz/`, `backend/app/agents/pfz_agent.py`, `frontend/src/lib/orca/pfz.ts`, `use-pfz.ts`, and `PFZAdvisory.tsx`. Coordinate map interface changes with Harpal. The current review repairs contracts; it does not yet connect a verified operational feed.

## Build in order

1. Complete the PFZ source review: official public WFS geometry exists, but inspected features have no expiry. Find the matching published sector bulletin, its actual issue/expiry and version. Preserve raw source references; never convert WFS response time into advisory time or assume a 24-hour validity. Verify reuse terms and access expectations before polling at scale.
2. Implement a source-specific adapter, including MultiLineString geometry and CRS validation. Keep line/polygon geometry explicit rather than treating vertices as independently issued fishing targets. Reject publication/geometry version mismatches. Agree an additive versioned geometry contract with Harpal; keep existing point clients working.
3. Cover all 14 named sectors, including Andaman, Nicobar and Lakshadweep separately. Replace approximate coordinate hints with verified sector polygons when available. Do not claim approximate boxes are official boundaries.
4. Preserve issue, expiry, retrieval, source, sector, language and availability end to end. Confirm manual refresh/revalidation cadence, rate limits and expiry. Expose a verifiable source link and explicit no-advisory publication separately from retrieval failure.
5. Make assistant references consume the same valid evidence as map/text; never infer fish abundance, transit safety, species or depth from PFZ presence alone. Audit repeated reads so revoked advisories disappear.

## Acceptance

Actual-provider evidence for at least one current publication with a documented expiry and geometry match; deterministic regressions for expired/no-publication/timeout/invalid data; browser sector switching with identical map/text results; islands and southern-tip cases; no invented measurements; documented uncovered sectors. Full nationwide coverage may remain unavailable, but must never appear complete without evidence.

## Dependencies and handoff

Pavan supplies independent marine measurements; they must not be silently inferred from PFZ. Prachi owns shared-cache infrastructure after the publication contract is stable. Darshil reviews cross-owner PRs sequentially and records the evidence gate in PHASES.md. This is the work Codex is carrying for Darshil.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
