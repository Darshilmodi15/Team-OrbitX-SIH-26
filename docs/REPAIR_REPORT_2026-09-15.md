# September 15 repair report

## What broke and what is now known

### Chat
The supplied screenshot shows `/api/chat` returning 503 `AI_PROVIDER_UNAVAILABLE`. The deployed `/api/health/providers` response showed Gemini HTTP **429** at 05:40:18 UTC on September 15. A separate request using the previous locally configured key also returned 429 `RESOURCE_EXHAUSTED`, including for the configured model. Model listing succeeded and included the configured model: this was not evidence of an invalid model name.

**Update from Darshil during this repair:** replacing the Gemini key restored chat. This recovery is user-confirmed. No key was changed by this repair and no further paid chat requests were sent after that update.

The AFC message is a SDK warning, not the confirmed cause of this outage. This code does not use function tools for synthesis/intent requests; automatic function calling is now explicitly disabled there. Intent classification now has an 8-second timeout and stops retrying other models after authentication or quota failures. Synthesis records `QUOTA_EXHAUSTED` instead of a generic failure for 429.

If this returns: open [Google AI Studio](https://aistudio.google.com/), select the project associated with the Render Gemini key, and view its active rate limits and usage. Check the model in Render → backend service → Environment → `GEMINI_MODEL`. Do not send anyone the secret key. Limits can be per minute, tokens or day, and apply to the project; a second key in the same project does not necessarily add capacity. See [Google's rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits).

### Dashboard
A real deployed request for public reference coordinates **18.9, 72.7** returned INCOIS wave height 1.48 m, wind 23.3 km/h, and Open-Meteo swell, surface temperature and current fields, with forecast time 2026-09-15 06:00 UTC. These are recorded test results, not current values to copy into the app.

The screenshot's selected coordinates returned a successful HTTP response whose fields were all null and mode unavailable. The frontend previously accepted that response and never attempted the independent Open-Meteo fallback. That branch is repaired. Separate upstream failures remain possible; they are not converted into fake values. The fallback now has a timeout even when a query cancellation signal is present. Dashboard polling checks every five minutes while active; provider forecast timestamps are preserved, so a poll does not pretend a new forecast was published.

The location validator uses a coarse 100 km coastal-support radius. Passing it does **not** mean a home pin is on water or has a marine grid reading. Use a departure/sea point for marine advisories. A future authoritative land/water check remains a separate map-data task; this repair does not move a home pin silently to a different town.

### Different frontend deployments
Your pasted successful build log is a **Render frontend build** of commit `13bb7da`, containing `index-Blg0eElY.js`. The Vercel address you use served `index-DSRVaVYz.js` during this review. These are different built artifacts. A successful Render build does not establish what is live on the Vercel URL. This may explain older controls; it does not by itself establish the exact Vercel commit.

In Vercel → the ORCA project → Deployments → open the deployment labeled Production → read its Git commit. Compare that with the backend Render deployment and the commit you intend to test. After deploying these repairs, reload the Vercel page. A browser reload cannot deploy local edits. Current local source has no port preset grid; its initial Mumbai map center is only a viewport, not a saved location.

## Voice and translation

| Path | Verified September 15 | Limit of evidence |
|---|---|---|
| Sarvam TTS with local configured key | HTTP 200 | Short Gujarati test |
| Deployed `/api/voice/speak` | HTTP 200 and audio | Gujarati, Bulbul speaker shubh |
| Deployed `/api/voice/transcribe-base64` | HTTP 200 and transcript | Audio generated in the preceding TTS test; not a real phone microphone |
| Bhashini model discovery with local configured credentials | HTTP 400 | Discovery configuration rejected |
| Bhashini direct inference with local configured inference key | HTTP 200 with translation | English-to-Gujarati test; existing fallback path works |

The voice router uses Sarvam. Bhashini is used for text translation; merely having its API key does not mean it handles microphone transcription. No replacement voice key is currently required by these successful tests. Real microphone permissions, recording formats and each language still need device checks. An old provider-health failure is historical unless its timestamp corresponds to your latest request.

## Changes in this repair

- Cookies: restrained layout, 11 languages, theme colors; optional analytics default off. Vercel Analytics only mounts after consent, and local analytics no longer start before consent.
- Privacy and terms: 11-language concise factual descriptions, light/dark/system selector. Removed unsupported government affiliation, automatic rescue relay and encryption/compliance claims. Retention/deletion policy and accountable project contact still need product decisions before a wider launch.
- Footer: emergency actions at the right on desktop, wrapped on mobile.
- Landing: removed duplicate Explore CTA that opened the same login flow.
- Location: Services now follows the location gate; attempts to navigate from the location screen show a translated location notice. Existing preset removal is preserved.
- Guide: removed the inline tour from the app, as authorized. A spotlight tour is deferred.
- Offline: dashboard downloads a UTF-8 `.txt` file in the selected language. No password, extraction or upload step. It includes available readings, source/validity times and verified PFZ points when available. Files are plain text, contain selected coordinates, and do not erase themselves or update after download. Existing encrypted reader code remains for older files but is no longer linked by this dashboard flow.
- SOS: no vessel, registration or crew form before the first request. The service entry obtains fresh GPS, including on land, instead of sending an old fishing pin. `/emergency` is separate from the coastal dashboard gate and available through the footer after sign-in. The explicit send button records the request; details can then update the same ID. Missing people count is marked not provided. Only the owner may update details. Failed requests are not marked recorded. Calling 112 remains available without a selected coastal location. GPS-denied manual emergency pin entry, built-in voice detail capture, live-operator calls and external emergency dispatch are **not** implemented by this repair.
- PFZ: new `/api/pfz/publication` reads the actual public INCOIS overview and shows its dates plus direct official link. Verified response: forecast date September 14, valid-up-to date September 15. Overview dates are date-only, with no invented expiry hour, and are separate from sector-specific map points. The structured sector point feed still needs integration; the national date is not used to certify unverified coordinates.

## Where to check real data — no database required

1. Open [backend Swagger](https://orca-backend-ycue.onrender.com/docs).
2. Expand **GET `/api/marine/conditions`** → **Try it out** → enter `lat=18.9`, `lon=72.7` → **Execute**. Omit the optional date or use today's date. This is a public sea reference, not a default user location.
3. In **Response body**, check `wave_height_m`, `wind_speed_kmh`, `sea_surface_temperature_c`, `source`, `forecast_valid_at`, `retrieved_at`, and `supplemental_fields`. A 200 alone is insufficient: values and timestamps must be present.
4. Open [provider health](https://orca-backend-ycue.onrender.com/api/health/providers). Read each provider's `http_status` AND `last_checked`; old failure records do not describe a new successful request.
5. After deploying this repair, use **GET `/api/pfz/publication`** for the real overview dates. **GET `/api/pfz`** remains the separate structured-point contract.
6. Tides currently have no authoritative station/datum feed, so `/api/marine/tide` may return 503. That single missing service should not blank the weather panel. Chlorophyll also remains unconnected.
7. For a new chat failure, open Render → **backend web service** → **Logs**, send one chat, then copy the lines at that exact time containing `Gemini`, `status=` or the error code. Frontend build logs and PostgreSQL checkpoint logs do not show the Gemini cause. Never paste environment values or tokens.

## Data access work still needed

- **Open-Meteo and INCOIS ocean-state forecast:** already connected; no new API account is needed for the existing public path. The [marine documentation](https://open-meteo.com/en/docs/marine-weather-api) explains variables. Real updates mean model forecast cycles, not live sensors at the boat.
- **PFZ points:** [INCOIS official PFZ page](https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en) has published daily dates and sector access. The overview parser is now implemented; a verified sector publication-to-coordinate mapping is still missing. No invented API credential should be put in `.env` to disguise this code/data gap.
- **Chlorophyll:** select a real daily satellite product and validate cloud/quality flags before calling it current water conditions. NASA [Earthdata registration](https://urs.earthdata.nasa.gov/) and [Earthdata Search](https://search.earthdata.nasa.gov/) are the account/search entry points if the team chooses a NASA product. Product ingestion remains engineering work, not something a key alone fixes.
- **SOS dispatch/live operator:** an actual receiving organization and delivery integration are required. An ORCA database record and an operator dashboard are not a connection to Coast Guard dispatch.

## Verification

- Full backend suite: **441 passed, 5 skipped** (isolated test database, no production SOS).
- Frontend suite: **115 passed** after final edits, including consent and translation checks.
- Production build and lint passed; lint retains existing warnings and build retains a large-bundle warning.
- Browser: English and Gujarati privacy/cookie content, Gujarati terms, light and dark visual inspection; essential-only consent dismissal.
- No commit, push, deployment, migration or production SOS was performed. User-owned acceptance documents and test tools were preserved.
