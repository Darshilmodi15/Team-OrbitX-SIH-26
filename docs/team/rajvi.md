# Rajvi — Assistant UX, onboarding and beta verification

## Outcome and ownership

Users understand what data is available, can ask questions in their language, and receive honest failures. Own assistant/onboarding UI, translation QA, acceptance scenarios and release evidence documentation. Coordinate backend chat changes with Darshil, location gating with Heth and offline prompts with Prachi. Preserve conversation ownership, authentication and current database migrations.

## Build in order

1. Audit assistant text/voice against actual selected location and current evidence. Test missing/stale marine data, provider quota/timeouts and account conversation isolation. Never fill gaps with hardcoded “live” answers, fake speech transcription or browser capability checks that stand in for server STT success.
2. Translate domain explanations, sector names, error states and controls in the existing 11-language system. Technical source names can remain named sources; meanings of unavailable/no-advisory/expired must remain distinct. Test long labels and screen readers on mobile. Ask native readers to review translations before marking them field-ready.
3. Build a short dismissible/replayable task tour after location flow is settled: choose location, inspect source/expiry, read PFZ, save a pack if shipped, ask the assistant. Do not describe planned features as active. Show provider errors with actionable next steps without exposing raw provider messages or secrets.
4. Maintain a beta acceptance matrix and run it against the actual candidate deployment: sign-in, account changes, location gating, real chat, real STT/TTS where credits exist, PFZ unavailable/current/expired, marine partial outage, map layers, offline pack, slow network and accessibility. Separate fixtures from actual live-provider checks.
5. Record frontend and backend deployment IDs, git SHA, schema revision, config prerequisites and compatibility. Prepare a rollback drill using a known compatible frontend/backend pair and additive migration strategy. Do not mark release recovery done merely because a frontend build passes.

## Acceptance

Reproducible results with expected/actual outcomes and evidence, no unresolved critical auth/data-truthfulness regressions, user-facing translations reviewed, real voice quota state documented, and a tested candidate rollback procedure. Darshil owns final release coordination; any credential/billing/field-test blocker must name the concrete human action and its purpose.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
