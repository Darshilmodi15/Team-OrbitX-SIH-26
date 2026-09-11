# Chat failure verification — 2026-09-11

The deployed backend health endpoint and chat CORS preflight returned 200. With the user's explicit approval, the repository's fisherman demo account successfully logged in (200), but one public connectivity-test chat returned 500 after 7.6 seconds. No token or profile was printed. The deployed 500's precise server exception is not available from the public response; production logs are still needed.

Separately, the locally configured Gemini key was tested directly with a public one-word prompt. The configured `gemini-3.5-flash` model and existing `gemini-3.7-flash` / `gemini-flash-latest` alternatives all returned HTTP 429. Model listing succeeded. This establishes a generation quota/rate-limit blocker for the local key, not proof that production uses the same key or has the same exception. No billing or key changes were made.

## Repairs and checks

- Removed network-failure login impersonation and fabricated profile responses. Login and chat now use the same configured API, without forwarding login credentials to a different backend.
- Disabled the active scripted chat fallback, which had labeled missing evidence `safe`, supplied official source names without retrieved evidence, and created a current data timestamp. Provider failures now return the established 503 contract and preserve only the user turn.
- Stop Gemini model retries on 401, 403 and 429. Log controlled error classes/statuses instead of raw provider exceptions.
- Show a readable provider-unavailable message in the frontend.
- Regression checks cover both located/unlocated failed chat, no fake assistant turn, account-error retry limits, offline login rejection, legacy demo token validation, and frontend outage handling.

Validation: 28 focused backend tests passed; all 52 frontend tests passed; frontend production build and whitespace checks passed. The build retains its bundle-size warning. These are local results, not proof of production recovery. The complete backend suite was not rerun for this focused incident repair.

## Remaining work

Restore generation capacity for the configured Gemini project/key (429 may indicate quota exhaustion or rate limiting), inspect deployed logs for the 500, then release and repeat the authenticated end-to-end chat test. No commit, push, or deployment was performed by this agent. Other workspace activity changed HEAD during this investigation; existing CORS changes were preserved.

Earlier CI/live-provider verification work remains in `.github/workflows/ci.yml`, `.github/workflows/live-verification.yml`, and `backend/scripts/verify_live.py`. Marine/voice provider success does not establish Gemini chat availability. The live-provider workflow requires a GitHub `SARVAM_API_KEY` secret and manual dispatch; ordinary CI runs on pushes and pull requests once the workflows are present on GitHub. No GitHub workflow run or repository-secret change was performed in this investigation.
