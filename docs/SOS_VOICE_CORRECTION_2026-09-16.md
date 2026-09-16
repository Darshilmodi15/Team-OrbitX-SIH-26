# SOS location and chat voice correction — 16 September 2026

The user reported matching marine data across devices but incorrect SOS presentation, missing officer descriptions, duplicated chat snapshot panels, and an incomplete voice interaction. Device parity is user-reported; it is not a new agent-captured physical Android test.

## Confirmed causes

- `ServicesPage` always replaced the saved ORCA selection with device GPS when opening SOS. There was no explicit choice between the incident selection and the physical device position.
- The officer screen emphasized `assigned_mrcc` (Mumbai for west-coast longitudes) without identifying it as a suggested contact. It did not render `recorded_telemetry.notes`. The creation dialog only exposed the description after the first request.
- Each marine chat response rendered condition cards in addition to the answer, plus a snapshot disclosure. Its embedded map rendered another disclosure and another set of cards.
- The direct Bhashini ASR fallback used `bhashini/ai4bharat/conformer-multilingual-asr`, which returned HTTP 500. Real probes passed for English Whisper, Gujarati Indo-Aryan Conformer and Hindi Conformer. Sending English to the Indo-Aryan route also failed, confirming language-specific routing matters.
- Browser audio was declared as 16 kHz regardless of its actual sample rate; MP4 was labeled WAV.

## Changes

- SOS starts from the saved selection when available, shows its coordinates and asks the user to confirm the incident location. Device GPS is a separate explicit option. No selected location means GPS must succeed; no default coordinates are introduced.
- Selected-location submissions are checked against the authenticated account's current saved coordinates. A stale tab gets HTTP 409 instead of recording an old selection.
- The first SOS request accepts optional notes; both location label/source and notes persist in the existing telemetry JSON. No schema migration is needed. Descriptions can still be added afterward.
- Officer cards identify the incident coordinates, supplied location label, source and notes. The suggested rescue contact is separate and the screen explicitly states no electronic rescue dispatch occurred. Old records have no invented location label or description. MRCC routing remains a coarse longitude-based contact suggestion, not verified dispatch jurisdiction.
- Chat keeps one expandable snapshot disclosure, and only mounts its compact map after expansion. The compact map does not repeat snapshot details or condition cards.
- The composer has separate dictation and voice-conversation controls. Dictation produces editable text and requires Send. Conversation mode explicitly explains auto-submission after a pause; it calls the same `ask` function, plays the real TTS response, then listens again. It is turn-based cloud speech, not a full-duplex realtime audio model.
- The waveform measures microphone amplitude. Capture stops at 30 seconds or, in conversation mode, after detected speech followed by a pause. Cancellation prevents pending STT from submitting and stops recording/playback. Provider errors stop the loop without fabricated transcripts.
- Browser recordings are decoded and resampled to mono PCM16 WAV at 16 kHz. The backend validates the actual WAV header. Direct non-normalized callers receive HTTP 415 instead of mislabeled provider input.
- Existing language policy is retained. English, Gujarati and Hindi ASR routing was probed against real Bhashini services. Other configured languages remain routed but have not all been re-probed.

## Evidence before deployment

- Backend: 475 passed, 5 skipped (full suite).
- Frontend: 135 passed (full suite), then 14 focused tests passed including the added compact-map disclosure test and portal voice dialog. Build passed.
- Isolated HTTP: normal login 200; Veraval selection 200; clearly labeled local test SOS 201 with exact `20.9,70.37`, label and notes; Gujarati and Hindi transcription 200, Bhashini, `is_mock=false`.
- Normal browser login and new composer rendered in local Chrome. SOS location choice rendered with saved coordinates and a separate GPS option.
- No production distress alert was created for these checks.

## Acceptance still required

Production rendered chat/SOS/operator checks; physical desktop and Android microphone dictation and conversation; background/tab changes during recording; noisy-environment pause detection and playback/autoplay behavior. Do not describe these as verified merely because automated tests and direct provider probes passed.

Sanitized local HTTP evidence: `/private/tmp/orca-sos-voice-local-report.json`.
