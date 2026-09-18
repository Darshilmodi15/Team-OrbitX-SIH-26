# Real-browser network acceptance

18 September 2026. Local candidate `251ba35`; isolated backend at port 8013,
Vite frontend at port 5175. This is not deployed-candidate acceptance.

| Profile / transition | Result | Evidence and limits |
|---|---|---|
| Normal connection | PARTIAL PASS | In-app browser: login, Mumbai dashboard/map, English and Gujarati chat, source details, trace, history reload. Chrome incognito: login, saved location and dashboard with actual canonical data. No timed cold-load benchmark. |
| Actual Chrome DevTools 3G | PARTIAL PASS | Network selector visibly `Presets: 3G`; dashboard changed to `Low-data mode`; Satellite became disabled; cached canonical values and original retrieval time remained. |
| Very slow custom profile | PENDING | Native Chrome control stopped responding after the 3G check. |
| Offline | PENDING | Not manually verified under actual offline network in this run. |
| Reconnect | PENDING | Not manually verified in this run. |

The 3G result is a real DevTools profile, not a navigator override. It verifies
the immediate low-data transition, not every network-mode requirement. Polling
intervals and optional-fetch suppression have automated/code evidence only.
No throttled full-page cold-load, 15-minute polling observation, successful
offline download/open, or zero-tile offline count is claimed.

Native screenshot capture failed with a ScreenCaptureKit invalid-parameter error;
subsequent menu control failed, followed by no-window/timeout errors. A close
command was sent to the isolated incognito window, but cleanup could not be
visually confirmed. Check that test window's throttle setting before reusing it.

## Remaining manual checklist

- [ ] Use production build/preview and repeat on the deployed candidate.
- [ ] Normal: dashboard, map, both language queries, trace/source/history.
- [ ] 3G: verify optional layers disabled, no satellite requests and 15-minute
  refresh cadence; record actual load/interaction timings.
- [ ] Custom slow: record download/upload kbps and latency, then repeat.
- [ ] Offline: zero map tiles; cached snapshot visibly timestamped and stale;
  download/open readable trip notes and verify emergency references without
  placing a call or sending SOS.
- [ ] Reconnect: retain cached content until verified fresh response arrives;
  do not change original valid/retrieved timestamps into "live" timestamps.
- [ ] Test cold offline entry separately from disconnecting an already loaded app.
- [ ] Restore `No throttling` and close only the test incognito window.

All pending rows remain release gates. Unit tests are not physical/network proof.
