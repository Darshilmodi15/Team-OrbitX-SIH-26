# BHASHINI physical-device acceptance

Status: **PENDING — deferred by the user on 18 September 2026.**
No Android microphone or human speech-quality result is claimed. The existing
11-language synthetic TTS-to-ASR checks establish transport only. Keep Sarvam
available until the required demo-language device acceptance passes.

## Setup and recording matrix

- [ ] Record Android model/version, Chrome version, deployed frontend/backend SHA,
  test date, connection type and reviewer/native-language fluency.
- [ ] Log in to a test account, choose a reference coastal location, grant the
  microphone permission, and check the visible recording indicator.
- [ ] For **each of Gujarati, Hindi and English**, record **10, 30 and 45 seconds**
  in both a **quiet room and moderate background noise** (18 recordings total).
- [ ] Add Gujarati+English and Hindi+English code-switched recordings in both
  environments. Do not include personal information or real distress calls.
- [ ] Confirm automatic stop at 45 seconds; no clipped final words or duplicate send.

Suggested starting sentences (continue naturally for the target duration):

- Gujarati: આજે દરિયાની સ્થિતિ કેવી છે? પવન અને મોજાં વિશે સમજાવો.
- Hindi: आज समुद्र की स्थिति कैसी है? हवा और लहरों के बारे में बताइए।
- English: Explain the current wind and wave forecast and its limitations.
- Gujarati+English: આજે wave height અને wind speed કેટલી છે? source પણ બતાવો.
- Hindi+English: आज wave height और wind speed कितनी है? source भी बताइए।

## Results — fill one row per recording

| Language / noise / seconds | STT transcript and errors | English translation meaning | TTS intelligibility / language | STT / translation / TTS latency | Pass or issue |
|---|---|---|---|---|---|
| PENDING | Not run | Not run | Not run | Not measured | Pending user test |

Acceptance requires a native reviewer to confirm meaning, negation, safety terms,
place names and code-switch handling; a 200 response is not a quality pass.

## Error handling and end-to-end checks

- [ ] Denied microphone: clear actionable error, no fake transcript.
- [ ] Silence/empty recording: honest rejection, no invented words.
- [ ] Offline/provider failure: retry/error state, no false successful send.
- [ ] Reconnect: original transcript preserved for an explicit retry.
- [ ] STT → language/translation → grounded chat → TTS works in each demo language.
- [ ] Saved conversation, source disclosure and operational trace survive reload.
- [ ] Reviewer records pass/fail and screenshots, excluding secrets and personal data.

Do not trigger a real SOS during this test. Use only a documented isolated test mode.
Do not remove Sarvam runtime usage, secrets or architecture references until this
checklist is completed and accepted. Android/PWA/mobile release smoke remains pending.
