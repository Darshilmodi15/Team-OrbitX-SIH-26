# ORCA product QA and reliability audit

Audit dates: 6–7 September 2026. Local FastAPI + React application, with an isolated SQLite QA database. This is an evidence report, not a production readiness certification. No deployment or push was performed. On resuming September 7, the earlier audit changes were already in existing commit `a762e0e`; this continuation did not create that commit. The final footer clearance adjustment and this report remain local.

## 1. Root causes found

- Chat conversation creation occurred outside the protected send/error lifecycle. A failed creation could leave sending state stuck. Suggestions and typed submission needed the same reliable path, and asynchronous history loads could replace an active conversation.
- AI generation could silently return deterministic template content. The configured Gemini 2.5 Flash generation request actually returned HTTP 404, despite model listing suggesting availability. Generation failures were hidden by fallback responses.
- Selected UI language could override the language of the actual message; downstream translation could translate an already correctly localized answer again.
- Speech errors and empty/mock results were insufficiently distinguished from successful transcription. A previous quota diagnosis did not describe the freshly configured key: valid audio succeeded during this audit.
- Health displayed configuration/placeholder state rather than observed request outcomes. Cached data could obscure provider failures and freshness.
- Marine paths included generated future values, fixed tide times, undated PFZ samples, synthetic analytics, and seed advisories. Missing/stale measurements could produce a reassuring safety label.
- Location state included a silent default and insufficient account persistence. A coarse polygon also discarded the legitimate Veraval search result.
- Several database writes could fail yet return apparent success through memory fallback. Admin user listings could merge cached/demo accounts with database records.
- SOS lacked authenticated frontend requests and could display success after a failure. Initial status and copy implied dispatch even though no outbound rescue integration exists.
- Officer/admin screens shared inappropriate public-user patterns, untranslated text and developer-facing explanations. Removing fake footer contacts left an unused grid column; fixed mobile actions also covered legal links.

## 2. Files changed

The 51 implementation/test files below are the audit change set now present in `a762e0e`. September 7 adds a further mobile/tablet clearance adjustment in `LandingPage.tsx` and this report.

- `backend/app/data/pfz/mock.py`
- `backend/app/data/weather/incois.py`
- `backend/app/main.py`
- `backend/app/models/admin_models.py`
- `backend/app/models/agent_models.py`
- `backend/app/models/emergency_models.py`
- `backend/app/models/user_models.py`
- `backend/app/routers/location.py`
- `backend/app/routers/pfz.py`
- `backend/app/routers/voice.py`
- `backend/app/services/admin/admin_service.py`
- `backend/app/services/auth/auth_service.py`
- `backend/app/services/bhashini.py`
- `backend/app/services/dialogue_synthesizer.py`
- `backend/app/services/emergency/emergency_service.py`
- `backend/app/services/government/government_service.py`
- `backend/app/services/language/sarvam.py`
- `backend/app/services/location/location_service.py`
- `backend/app/services/provider_health.py`
- `backend/seed/seed_database.py`
- `backend/tests/test_admin_and_historical.py`
- `backend/tests/test_chat_ownership_rbac.py`
- `backend/tests/test_emergency.py`
- `backend/tests/test_product_reliability.py`
- `frontend/src/components/EmergencySOSModal.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/orca/AppShell.tsx`
- `frontend/src/components/orca/CoastMap.tsx`
- `frontend/src/components/orca/Conditions.tsx`
- `frontend/src/lib/orca/audit-translations.ts`
- `frontend/src/lib/orca/geo.ts`
- `frontend/src/lib/orca/i18n.tsx`
- `frontend/src/lib/orca/marine.ts`
- `frontend/src/lib/orca/session.tsx`
- `frontend/src/lib/orca/types.ts`
- `frontend/src/lib/orca/use-marine.ts`
- `frontend/src/pages/AssistantPage.tsx`
- `frontend/src/pages/AuthPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/pages/LocationPage.tsx`
- `frontend/src/pages/OperationsPage.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/test/assistant-behavior.test.tsx`
- `frontend/src/test/dashboard-reliability.test.tsx`
- `frontend/src/test/geo-search.test.ts`
- `frontend/src/test/location-behavior.test.tsx`
- `frontend/src/test/operations-behavior.test.tsx`
- `frontend/src/test/session.test.tsx`
- `frontend/src/test/sos-behavior.test.tsx`

## 3. Bugs fixed

Chat now handles conversation creation and submission within one error lifecycle, restores retryable input on failure, prevents duplicate sends, persists owned conversation history, and submits the displayed suggestion text. Provider failure produces an explicit error rather than an invented assistant answer. Gemini generation uses the successfully exercised `gemini-3.7-flash` default with `GEMINI_MODEL` override. Actual-message language takes priority; selected language is an ambiguity fallback.

Speech validates uploaded/base64 audio and rejects empty/mock upstream results. Sarvam request outcomes are recorded without credentials. Transcription populates editable input for review. Microphone failure clears recording state; a successful physical-device microphone recording was not exercised.

Provider health now derives paid-provider status from actual requests. It records sanitized failure reasons, HTTP status, last request/success/failure, provider/data mode and freshness. Never-requested services say “Not yet verified”; old successes degrade to stale. Reading health does not issue paid probes.

Removed active sample PFZ/advisory seeding, fabricated tide/forecast/analytics output, and map overlays without real supporting data. Missing measurements remain unavailable; stale/incomplete conditions no longer yield “Safe to go.” Browser cache version changed so earlier synthesized forecasts are not reused.

Normal users explicitly choose GPS/manual location, validate support, and save it to their account before proceeding. No saved location returns null. Officer/admin sign-in routes directly to their respective operational pages. Officer assigned region is shown. Database write failures return errors; database account state governs authorization and admin listing.

SOS now authenticates the request, requires crew input, persists before reporting success, and reports “Received.” Copy states that rescue dispatch is not confirmed. The footer uses two intentional content columns, translated prototype disclosure, and enough bottom clearance for the fixed actions.

## 4. APIs verified and visible-consumer contracts

“Live verified” below means an actual successful request in this audit, not continuous availability. Automated contract coverage is distinguished from live provider verification.

| Endpoint/path | Authentication/role | Source and mode | Failure behavior / frontend consumer | Evidence |
|---|---|---|---|---|
| `/api/chat` | Authenticated, owned conversation | Gemini generation; marine evidence where location exists | 503 on provider failure; AssistantPage retry state | Actual distinct English/Gujarati answers; ownership regression tests |
| `/api/conversations` and message history | Authenticated owner | Database | Reject cross-account access; AssistantPage | Actual HTTP 200 and persistence/IDOR tests |
| `/api/voice/transcribe` | Public endpoint with existing request protections | Sarvam Saaras v3 | Invalid input 400/415; unavailable upstream 503; AssistantPage | Valid WAV → HTTP 200, exact transcript “What is a fishing zone?” |
| `/api/voice/transcribe-base64` | Public endpoint | Sarvam | Strict base64/input validation | Automated malformed/provider-error coverage |
| `/api/voice/speak` | Public endpoint | Sarvam Bulbul v3 | No fake audio success | Live TTS not exercised |
| `/api/admin/system-health` | SUPER_ADMIN | Observed provider telemetry + database check | Partial/unknown state preserved; OperationsPage | Admin 200, user/officer 403; real provider timestamps visible |
| `/api/admin/users` | SUPER_ADMIN | Database only | Database error propagates; OperationsPage | Admin 200, other roles 403; three local accounts rendered |
| `/api/user/profile` | Authenticated | Database | Failed save cannot appear persistent; SettingsPage | All three roles HTTP 200; persistence/security tests |
| `/api/location/validate` | Public | Static geographic coverage rules | Unsupported location clearly rejected; LocationPage | GPS/manual/denied/unsupported behavior tests |
| `/api/location/update`, `/current` | Authenticated owner | Database; in-process read cache | Save failure 503; no saved record null | Actual Veraval selection, reload and API 200 |
| `/api/emergency/sos` | Authenticated | Database | Save failure 503; success 201 RECEIVED; SOS modal | One explicitly labeled isolated local QA request persisted |
| `/api/emergency/sos/active` | GOVERNMENT or SUPER_ADMIN | Database | Unauthorized 403; OperationsPage | Officer/admin 200, user 403; record rendered in officer dashboard |
| `/api/pfz` | Public | No verified timestamped advisory feed | 200 with empty zones and explicit unavailable mode; map | Actual HTTP 200 unavailable response |
| Government announcements/documents | Read routes public; writes role-protected | DB announcements; no verified document feed | No seeded official-looking content; AlertsPage | Actual empty HTTP 200 responses |
| `/api/marine/conditions`, `/forecast`, `/risk` | Public | INCOIS, cache; Open-Meteo weather fallback | Missing/stale data shown; Dashboard/Conditions | INCOIS HTTP 200 observed; browser stale wave/wind with other values unavailable |
| `/api/marine/tide` | Public | No verified feed | Explicit 503 TIDE_FEED_UNAVAILABLE | Code and focused regression coverage |
| `/api/analytics/ocean`, `/productivity` | Public | No verified feed | Explicit unavailable response instead of synthetic values | Code/focused coverage; old suite expectations fail |
| `/api/marine/historical-comparison` | Public read | Stored observations | 503 for absent/incomplete evidence | Focused DB-backed tests |

Sanitized local role/API results: `/private/tmp/orca-api-verification.json`. No API keys or authentication tokens are included in this report.

## 5. APIs still failing or not verified

There is no timestamped current PFZ feed, verified tide feed, productivity/ocean analytics source, government document feed, or outbound rescue/communication integration. These features report unavailable rather than fabricated success. Gemini's previous default generation failed 404; the replacement succeeded during this audit. Sarvam valid STT and translation returned 200; there is no evidence supporting exhausted quota for the current key.

Live Sarvam TTS and forced live Open-Meteo marine fallback were not exercised. “Not yet verified” remains appropriate for those telemetry entries. The local Redis configuration points to a Render-internal hostname unavailable locally; in-process cache is being used. No claim is made about production networking or deployment state.

## 6. Real data sources

- Sarvam: actual STT and Gujarati translation responses observed. The valid generated speech fixture was 16 kHz WAV, about 1.33 seconds. An initial zero-duration fixture produced a real 400 invalid-request error; that was a fixture problem, not quota evidence.
- Gemini: actual generation returned different answers to different questions. English input under Gujarati UI answered in English; Gujarati input under English UI answered in Gujarati.
- INCOIS: actual successful response and telemetry observed. Success does not imply every metric exists or remains fresh. Stale wave/wind values were visibly labeled and safety withheld.
- Open-Meteo geocoding: actual Veraval search result; marine/weather fallback is a separate operation and was not thereby verified.
- Database: users, roles, locations, conversations/messages and SOS records. Reference coastline/boundary geometry is static geographic data, not a live advisory.

## 7. Fallback, cached, sample and synthetic classification

| Category | Current behavior |
|---|---|
| Backend/browser marine cache | Real previous observations; tracked as cache/stale. Browser marine cache moved to v3. |
| Open-Meteo fallback | Real alternate weather source, not evidence that INCOIS is healthy. Live failure-triggered transition still needs verification. |
| Development demo accounts | Explicit local development fixtures; not a substitute for production database authentication. |
| Static ports, coastal polygons, IMBL/reference geography, emergency contacts | Reference data and routing heuristics; not live official directives or confirmed rescue dispatch. Contact currency was not independently certified. |
| PFZ/sample government records | Removed from active default output/seeding; source files may remain for reference. |
| Generated tide/future forecast/productivity | Removed from live product output; unavailable where no real source exists. |
| Explicit simulation/demo endpoints | `/api/simulate` is hypothetical output; `/api/demo/dahanu` uses a fixed demonstration question/location. These are not personal-location observations. |
| Legacy stored marine rows | Existing development DB contains four observations whose provenance was not independently established. No rows deleted; historical trust remains a review item. |

This classifies the audited visible data paths. It is not a certification of every legacy endpoint, reference file or unreachable helper in the repository.

## 8. Translation coverage

New audit translations cover all 11 supported locales: English, Hindi, Gujarati, Marathi, Tamil, Telugu, Malayalam, Bengali, Kannada, Odia and Punjabi. Officer/admin navigation, headings, health labels, status/empty/error states and the new footer text use the existing i18n mechanism. Officer/admin language switching was manually exercised through all 11 locales; automated operations tests cover the same set.

Full application localization is not certified. Raw provider/account/reference names remain intentional data. Some older assistant risk/boundary labels, diagnostics, authentication errors and SOS reference text remain English. Native-speaker review of translation quality and all long-string layouts remains outstanding.

## 9. Database findings

Read-only inspection of `backend/orca_dev.db`: three users, zero chat messages/SOS/locations, four marine observations; no conversations table in that older schema. Foreign-key check found zero violations. No existing development rows were deleted.

The isolated QA database `/private/tmp/orca-qa-20260906.db` contains the three test accounts, three conversations and seven chat messages at the inspected snapshot, saved user location, and one local test SOS. Counts for observations/locations may grow during polling or manual verification. Its foreign-key check also found zero violations. The saved Veraval coordinates survived reload and were recovered via the authenticated backend. The QA SOS remained visible after a later browser sign-in.

Ownership, current database role enforcement, inactive accounts, role changes, final-admin protection and persistent writes have regression coverage. Production migrations, concurrent writes, backups and recovery were not tested. Existing databases need schema/migration review before release; creating a fresh QA schema is not migration proof.

## 10. Test results

- Frontend: **34 passed, 8 files**, rerun September 7.
- Full backend: **64 failed, 216 passed, 4 skipped, 1 warning**, 167.41 seconds, rerun September 7. Full local log: `/private/tmp/orca-audit-backend-sept7.log`.
- Focused backend reliability/auth/ownership/voice/emergency/admin/history checks from the preceding audit continuation: **51 passed, 1 warning**. Log: `/private/tmp/orca-focused-release-check.log`.
- Production `tsc -b && vite build`: passed after the final footer adjustment. Main chunk approximately 534 kB; bundler warns above 500 kB.
- Python compilation and `git diff --check`: passed.

Provider credentials were blanked for the full automated backend run, so it cannot certify real provider availability. Many failing legacy tests expect deterministic chat/translation fallback, seeded PFZ/government data or synthetic tide/analytics. The marine risk contract test specifically still expects a fabricated visibility-risk entry that was removed. Other failures include authentication fixtures and orchestration contracts; they must be triaged individually. Do not weaken authorization or restore fake data to make them pass.

## 11. Manual UI verification performed

- Normal-user login, dashboard, map, suggestions, typed send, new conversation and logout.
- Real English/Gujarati chat requests under opposite UI-language settings; distinct provider answers rendered.
- Manual Veraval search/selection/confirmation and page reload restoring coordinates. No silent Surat location.
- Dashboard stale-data display, unavailable metrics/safety/forecast, and absence of fake PFZ overlays.
- Officer login directly to operational overview, assigned Gujarat & Maharashtra region, zero-SOS state and later persisted populated SOS state. No dispatch was performed.
- Admin overview, real account list and API/data-health details, desktop and 390-pixel mobile rendering.
- All 11 languages switched on officer/admin pages.
- Footer desktop inspection in the earlier audit, then mobile 390×844 and tablet 768×1024 checks. Final adjustment places legal links above fixed quick actions; no abandoned third column.
- Final officer browser console check returned no captured errors. This covers that observation window, not every route/session.

Device microphone permission grant and real human recording were not manually completed. Provider STT was verified with generated audio; permission-denial and state cleanup are automated tests. Not every legacy button, dialog, map gesture or pagination path was manually exhausted.

## 12. Remaining confirmed issues and release limits

1. The full backend suite is not green. Resolve failures by preserving truthful data/error contracts, updating only obsolete expectations, and fixing independently confirmed defects.
2. Historical development observation provenance and existing-database migrations require review. Do not expose legacy sample observations as authoritative history.
3. Several previously advertised live capabilities have no verified feed. Unavailable states are now honest but do not supply those missing integrations.
4. Officer communication is unavailable; SOS receipt is not rescue dispatch. Operational region changes are not a separately verified officer-assignment workflow.
5. Localization gaps remain in older paths; all-language linguistic quality and all responsive states are not certified.
6. Live TTS, forced Open-Meteo fallback and physical-device recording still need verification. Redis fallback in this local environment is confirmed.
7. The production bundle has a main chunk above 500 kB. Build succeeds; performance on low-end devices was not measured.
8. Some public legacy marine endpoints retain explicit Mumbai query defaults; personal chat/location no longer infer a user location. Explicit demo/simulation routes remain distinct audit targets.

The application is materially more truthful and the audited critical paths have improved, but this report does not mark ORCA ready for production release.

## Supporting references

Official documentation consulted during the audit: [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash) and [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api). Actual request results above, rather than configuration or documentation alone, support the provider verification claims.

## Follow-up: English emergency prompt misclassified as Telugu

The user's screenshot exposed a missed case after this report. Persisted request evidence shows user language `en`, exact message `Emergency numbers`, assistant language `te`, and `sarvam_language_identification` in the source trace. The backend had trusted remote language detection before checking the actual script/English input. It then translated the misclassified input and planned unrelated geospatial, boundary and hazard work. Earlier English/Gujarati checks did not cover this failure.

The language service now checks native script and recognized Romanized Indic markers first, resolves plain ASCII text locally to English, and uses remote identification only for unresolved alphabetic input. Emergency contact lookup planning no longer retrieves operational marine evidence. The generation prompt requests a brief contact list and explicitly gives current language precedence over history. No hardcoded AI answer was added.

Verification: 24 focused reliability tests passed, including the exact prompt with/without coordinates under English, Gujarati and Telugu UI preferences, and native/Romanized language preservation. Tests assert no remote language identification, translation or weather call for this English prompt. Two actual browser retests against the updated local API encountered Gemini HTTP 503; no successful rendered post-fix answer or latency improvement is claimed. Provider availability is an outstanding blocker. Python compilation and diff whitespace validation pass.

## September 8 live follow-up

The exact English contact prompt returned HTTP 200, language `en`, and zero operational tasks in 12.04 seconds. For the default Gemini 3.7 Flash model, exact contact lookups now use `thinking_level: low`; other queries and model overrides retain their existing configuration. This setting is supported by [Google's thinking documentation](https://ai.google.dev/gemini-api/docs/thinking). A subsequent fresh request without coordinates returned HTTP 200 in 3.21 seconds with an English contact list. These single observations are not a controlled benchmark or latency guarantee. No static AI response was added.

Automatic approval review rejected a repeated request containing precise coordinates. The follow-up omitted both coordinates and prior history; no approval bypass was attempted. Browser inspection then confirmed the saved successful answer renders in English with the English UI selected. This was a read of the persisted API-generated answer, not an additional browser send. The previous provider-503 blocker did not reproduce on these successful requests, but provider availability remains variable.
