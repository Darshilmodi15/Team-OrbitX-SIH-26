# ORCA stabilization and acceptance — 18 September 2026

**FEATURE FREEZE: NO. Candidate not deployed.** No UI redesign or new feature
scope was added. Leaflet stays. Local success below is not production acceptance.

## 1. Commits and preservation

- Feature commit: `40798a20524b61e4f1593ed66f6c9b185194232e`.
- Chat stabilization/checklist: `4d957921bf73b8f2e9a7dce6bc05765c01fcb93e`.
- Merged candidate: `251ba354fc1b00289bbda7dbcb6d7d77755a1850`.
- Branch: `codex/feature-depth-leaflet`. No push performed in this phase.
- Preserved production-main history through `77fe7c77f52a9611b3c3c83121099eb2b6d7f573`.
  The user explicitly selected its newer ORCA logo-badge favicon; binary assets
  and SVG retained exactly. Homepage styles and satellite label overlay retained.
  Favicon/manifest cache references advanced to `v=4`.
- Reviewed diffs/status, clean whitespace check. Feature secret scan checked 50
  changed text files against actual local secret values and private-key/token
  patterns: zero findings. No `.env`, ADC, service-account key or actual credential
  was staged. This is not a substitute for a full dedicated security audit.

## 2–3. Existing production deployments — inspected, not deployed here

| Platform | Existing production identity | State |
|---|---|---|
| Vercel | `dpl_HhRemoX8MqExg4B22DF4RQTkjseG`; created 18 Sep 2026 22:07:35 IST | CLI reports Ready. Production URL: https://team-orbit-x-sih-26.vercel.app |
| Render | `dep-dammhjegekts73eh0aq0`; service `srv-da6hm6u1egvs738t3q50`; SHA `77fe7c77f52a9611b3c3c83121099eb2b6d7f573` | Dashboard reports Live on main. https://orca-backend-ycue.onrender.com |

The candidate has **no Vercel/Render deployment ID or deployment time**. Vercel's
exact Git SHA was not independently returned by the CLI inspect output. Render's
exact deploy timestamp was not captured (UI showed a relative time). Never assign
the existing production IDs to the new local candidate.

## 4. Earth Engine production acceptance

PENDING. Read-only project check confirms ACTIVE `team-orbitx-sih26`, number
`795586847632`. The service-account listing returned no accounts. Render's visible
environment list has GEMINI/BHASHINI/SARVAM credentials but no Earth Engine project
or Google credential-path entry; no secret file was listed. Secret values were
not revealed. No identity, key, IAM binding or Render config was changed.

Previous real local Mumbai and Paradip requests succeeded against GPM IMERG,
JRC Surface Water and SRTM with nine analysis cells each. Their full metadata is
in `verification/feature-integrations-2026-09-18.json` under this docs directory.
These are **local** results; both authenticated production requests remain pending.
Use a dedicated least-privilege backend identity and Render secret configuration,
never personal ADC or frontend credentials. See `INTEGRATION_REQUIREMENTS.md` at
the repository root. Noncommercial eligibility/remaining balance still need review.

## 5–6. Chat and Gujarati evidence

CONFIRMED locally: browser login → saved Mumbai location → owned canonical snapshot
→ English query → Gujarati follow-up → actual Gemini answer → source disclosure
and trace → persisted history → browser reload.

Conversation: `e48dd845-b6bb-4bfa-b4f6-4dafac665bb7` in the isolated verification DB.
History API returned 200 with exactly two user and two assistant messages: retry
did not duplicate the English user turn. Both answers contain the same canonical
1.36 m wave value, source/snapshot metadata, five trace stages and fallback=true.

| Query | Request ID | Actual generation path | Measured trace generation |
|---|---|---|---|
| English | `761c8aba-cd45-48ff-9a53-ba805e2ca82f` | primary 503 → alternate 200 → rejected numeric draft → alternate evidence repair 200 | 8136.4 ms |
| Gujarati | `20448d5d-06e3-4734-8bc8-0c7b67e8c0b8` | primary 503 → alternate 200 → rejected numeric draft → alternate evidence repair 200 | 9111.5 ms |

Actual model: `gemini-3.5-flash-lite`; preferred `gemini-3.6-flash`. Both IDs were
verified in the current provider model list; both also answered a simple greeting.
Thus local credentials/model availability worked, while grounded requests to the
primary returned upstream 503. This does **not** prove the exact internal reason
for Google's 503 or the root cause of an earlier production incident.

Production Render log search yielded no matching Gemini entries in its selected
last-hour window. The exact production root cause remains unverified; the new
diagnostics are not deployed. Render also warns that its free instance can delay
requests by 50 seconds or more when spun down; that is a separate latency risk,
not evidence that it caused the provider 503.

Fixes: per-attempt sanitized request_id/provider/model/upstream_status/category/
latency_ms/retry_count logs; isolated correlation context; no prompts, responses,
keys, user IDs or raw error bodies in these logs. HTTP timeout now maps to 504,
invalid/empty evidence to 502, and availability/auth/quota problems to 503 with
specific reason codes. One configured alternate is allowed for transient errors;
authentication/malformed requests do not fan out. Primary/alternate/evidence repair
share 40 seconds, maximum three HTTP calls; SDK retries disabled. Invalid drafts
never become answers. Client connections are closed.

Gujarati is a real native-script response, not native-speaker quality acceptance.
The rendered VHF transliteration deserves native review; do not treat this as
completed safety-language or microphone acceptance.

## 7–8. BHASHINI device results and Sarvam

PENDING by explicit user deferral. Created
`verification/bhashini-device-acceptance.md` at repository root, including Android
Chrome, actual microphone, quiet/noisy, 10/30/45-second, Gujarati/Hindi/English and
code-switch matrices, error handling and latency fields. Prior eleven-language
synthetic transport checks are not physical-device acceptance. **Sarvam retained**;
no provider secret or runtime removed.

## 9. PFZ reality check

Current official Maharashtra/Odisha web tables were found, with date-only expiry
19 Sep 2026 and actual DMS points. The national overview shows forecast date
18 Sep 2026. This corrects any inference that public coordinates do not exist.
However precise sector issue/revision, expiry timezone and permitted redistribution
are unresolved. INCOIS prohibits commercial reproduction without permission.
Distance-from-coast ranges are not circle radii. No static demo points added.

ORCA retains **Current verified PFZ advisory unavailable**; a real ingested PFZ
popup is not verified. Full findings: `verification/pfz-source-investigation.md`
at repository root.

## 10–11. Species and GIS

Prior real local checks: Mumbai OBIS historical results; Paradip empty sample;
no-data does not imply biological absence. Only Historical Occurrence is live;
Official Advisory and Habitat Suitability are separate, not fabricated evidence.
Data/source/retrieval periods and limitations remain visible.

Leaflet retained. Previous local desktop Mumbai/Paradip, 390×844, standard,
satellite, text-only, EEZ toggle, species, Earth Engine analysis cells, model samples
and vectors are documented in `FEATURE_DEPTH_REPORT.md`. They were not all repeated
after this stabilization merge. Existing screenshots:

- `verification/leaflet-mumbai.png`
- `verification/leaflet-east-coast.png`
- `verification/leaflet-mobile.png`

These paths are relative to this docs directory. No unsupported PFZ polygons,
protected areas or hazard extents were introduced.

## 12. Network modes

Real Chrome incognito login/dashboard succeeded. Actual DevTools `Presets: 3G`
switched the loaded dashboard to **Low-data mode**, disabled Satellite and retained
cached values/timestamps. This is partial acceptance, not a full throttled benchmark.
Native capture/control then failed. Slow-custom, offline/reconnect, offline trip
pack opening, zero offline tiles and timed polling remain pending. No emulated
navigator overrides were used. See root `verification/network-acceptance.md`.

## 13. Provenance and trace screenshots

- `verification/stabilization-chat-en.png`: expanded evidence/source details.
- `verification/stabilization-chat-gu.png`: actual Gujarati generation trace.
- `verification/stabilization-chat-reload.png`: Gujarati answer after reload.

Wave disclosure showed INCOIS OSF/WW3, model evidence, sampled grid, forecast-valid,
issued/retrieved times and unavailable resolution; no invented satellite/sensor.
History visibly transitioned to stale after expiry and said the saved snapshot
was not live. Sources and trace remained available after reload.

## 14–15. Favicon and mobile

Production logo-badge assets kept per user choice; versioned HTML/manifest references
are `v=4`. Build/TypeScript pass. Chrome incognito login rendered, but tab-icon
visual capture/hard-refresh proof was interrupted by native capture/control errors.
Physical mobile browser, installed PWA and Android smoke remain pending. Existing
390×844 viewport evidence is not an actual phone test.

## 16. Regression results on merged candidate

- Backend: **521 passed, 5 skipped** in 323.57 seconds.
- Frontend: **151 passed, 29 files** (rerun after merge).
- Focused chat stabilization: **19 passed**, including two-call outage cap,
  alternate evidence repair, deadline exhaustion, auth no-retry, sanitization,
  correlation isolation, malformed quota details and HTTP classification.
- TypeScript and production build passed. Main bundle 567.68 kB / 165.00 kB gzip;
  existing >500 kB bundle warning remains.
- Lint exit 0 with existing warnings; not a warning-free claim.
- `git diff --check` clean. No DB migration needed or applied in this phase.

## 17–18. Remaining gates and freeze decision

**FEATURE FREEZE: NO. Production readiness is not claimed.**

1. Provision/approve dedicated Earth Engine backend identity and securely install
   its credentials on Render. Confirm eligibility/usage and both production sites.
2. Complete actual slow/offline/reconnect/pack tests and restore/check Chrome's
   test throttling setting before reuse.
3. User completes Android/native-speaker BHASHINI and mobile smoke checklist.
4. Validate intended PFZ reuse and issue/expiry contract if activating ingestion.
   Unavailable is acceptable; fabricated data is not.
5. Complete favicon hard-refresh/incognito/phone/PWA acceptance.
6. After local gates, deploy exact backend/frontend candidate, capture both IDs,
   SHA and times, then fresh-incognito production and Android smoke including
   history/trace, Earth Engine, sources and isolated safe-mode SOS only.
7. Confirm production Gemini behavior using sanitized logs from that deployment.

No real emergency call, SOS dispatch, production account creation, credential
upload, cloud IAM mutation, release, or feature freeze occurred in this phase.
