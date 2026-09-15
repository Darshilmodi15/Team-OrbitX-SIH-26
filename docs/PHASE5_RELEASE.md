# Phase 5 — Release evidence and recovery

Core tooling prepared locally, 14 September 2026. Four release-tool tests pass; the actual local draft was generated and rejected as NOT READY with exit 1. Frontend verification is 112 passing tests and a successful production build. **No production release or rollback has been performed.** The currently deployed sites are not assumed to contain this working tree.

## Candidate record

`tools/release_check.py` is a standard-library Python tool with two read-only-to-host operations:

- `record` writes a new JSON record containing Git commit/dirty status and SHA-256 fingerprints of the built frontend, including the offline reader and worker. It never reads `.env`, calls a hosting API or deploys anything. It refuses to overwrite an existing record. Build hashes are inventory evidence, not proof the build was deployed or tested.
- `validate` exits nonzero until deployment IDs/URLs, frontend/backend commits, compatible database revisions, a previous verified deployment pair, restore evidence and all 16 required check results have evidence. The validator checks record completeness, not the authenticity of a human's evidence. Pending, failed or skipped required checks do not pass.

From the repository root, after tests and a production build:

```sh
rtk proxy python3 tools/release_check.py record --output docs/releases/candidate-YYYY-MM-DD.json
rtk proxy python3 tools/release_check.py validate docs/releases/candidate-YYYY-MM-DD.json
```

Choose a new filename each time. An uncommitted working tree intentionally produces `working_tree_dirty: true`; do not edit that flag merely to pass validation. Commit reviewed source and generate a new record for the actual candidate. Fill host deployment IDs and evidence references only after checking them. Never put passwords, signed URLs, tokens or database connection strings in a record.

CI now retains the frontend `dist` output and a draft build record under a commit-named artifact for 30 days. Existing frontend/backend test artifacts remain separate. The draft's manual/deployment checks stay `not_run`. A successful CI job is not a deployment approval; GitHub execution of this workflow is still unverified until it is pushed. Keep accepted release records and evidence in durable project storage because CI artifacts expire. The offline worker/reader are part of the release, not optional files to discard.

## Before promotion

1. Record the current known-working Vercel frontend deployment ID and Render backend deployment ID/commit. Verify that pair with real sign-in, chat, location and explicit data availability. If no pair is verified, record that as a blocker rather than naming the current production pair "known good".
2. Record production database revision, backup/restore evidence, API base URL/origin configuration (names and sanitized values only), compatible client/server versions and Redis namespace. The new marine namespace is `orca:marine:v3:`; old v2 entries expire naturally. No Redis flush is required.
3. Commit reviewed changes and obtain a candidate frontend and backend deployment without replacing the only working demonstration. Verify candidate URLs, deployment IDs and corresponding Git SHAs. Confirm preview frontend CORS uses the intended backend.
4. Use the numbered [manual checklist](MANUAL_ACCEPTANCE.md). Register failures by ID; do not turn missing live data into a successful provider integration. The current PFZ publication/chlorophyll gaps and untranslated offline viewer remain visible limitations until resolved.
5. Re-run the record validator and review every evidence reference. Obtain the team's acceptance of remaining product limitations. Only then perform promotion. This document does not claim those steps happened.

## Rollback drill — run on a candidate/staging environment first

The exercise is a complete frontend/backend/data compatibility check. Do not restore a production database merely to test rollback.

1. Prepare a staging database restored from an approved backup and scrubbed if needed. Record restore duration and migration revision. Verify no staging notification/SOS action reaches real emergency contacts.
2. Run the current candidate frontend/backend against it. Create a test conversation and confirm it can be read. Capture request IDs and sanitized results.
3. Choose the previously verified frontend/backend pair from the release record. Ensure both support the **current** database schema and API contract. Prefer additive schema migrations; an automatic destructive downgrade is not part of this workflow.
4. For Vercel, inspect the chosen target first. When the actual rollback is authorized and supported by the project's plan, use the verified deployment ID/URL with the CLI. On Hobby, the documented target is limited to the previous production deployment. Do not assume an arbitrary old target is available. [Vercel rollback reference](https://vercel.com/docs/cli/rollback).

```sh
rtk proxy vercel inspect VERIFIED_FRONTEND_DEPLOYMENT
rtk proxy vercel rollback VERIFIED_FRONTEND_DEPLOYMENT
rtk proxy vercel rollback status
```

These are operator command templates, not commands executed by this task. Replace the uppercase value with the verified target; do not paste secrets as arguments.

5. In Render, select the backend service's successful, compatible prior deployment and use its rollback action. Check service settings and auto-deploy behavior after rollback; do not assume a code rollback reverses database or external-state changes. Record the actual resulting deploy ID and health results. [Render rollback reference](https://render.com/docs/rollbacks).
6. Verify sign-in, the test conversation, location, marine/PFZ availability, provider failure handling and SOS failure semantics. Existing sessions must remain correctly authorized. Test both an already-open frontend tab and a fresh browser session.
7. Verify the offline worker lifecycle: an already-installed newer reader may remain on a device until worker update/activation; standalone downloaded files are version 1 and remain independent. Both the retained reader and replacement build must read supported trip files and enforce expiry. Do not claim frontend rollback deletes downloaded files or resets browser caches.
8. Re-promote the candidate only if desired and compatible, then repeat the same smoke checks. Record timestamps, observed downtime, both resulting deploy IDs and any manual settings changes. Attach the evidence to `compatible_rollback` and `database_restore`.

## Release stop conditions

Do not promote if authentication/account isolation is broken, safety data is fabricated or mislabeled, PFZ expiry is unproven, saved location can be bypassed, offline expiry fails, database compatibility/restore is unverified, or rollback targets are unknown. A provider may be explicitly unavailable in a limited demonstration, but it must not be described as a connected live capability.

All deferred operator and field checks are numbered in [MANUAL_ACCEPTANCE.md](MANUAL_ACCEPTANCE.md). That checklist separates core-code gaps from account setup and testing; a human cannot fix a missing ingestion adapter merely by providing an API key.
