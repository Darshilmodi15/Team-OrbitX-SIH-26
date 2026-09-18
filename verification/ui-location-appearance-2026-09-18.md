# Location, navigation and appearance verification

## Scope

Fix landing language-menu contrast; suggest Indian places while typing; redesign the location picker with adjacent results and sticky confirmation; distinguish an unselected map viewport from a real location; reset route scroll; expose Light/Dark/System and saved text sizing.

Leaflet, the newer production logo-badge favicon, authentication and backend location validation contracts are preserved. This change is pushed to the feature branch, not merged into production main.

## Confirmed locally

- Frontend: 161 tests across 31 files pass. TypeScript and production build pass. Lint exits 0 with existing repository warnings; the existing over-500-kB bundle warning remains.
- Landing dropdown labels are readable in both Light and Dark modes. Hero-trigger hover no longer creates white text on a white background. Escape closes the menu.
- Fresh isolated test account starts with no selected pin, no recenter action and no location/PFZ advisory in the picker. Confirmation is visible but disabled. The India-wide view is a viewport, not a saved location.
- Typing `Vera` in the browser, without pressing Search, returned real Open-Meteo suggestions including Verāval, Gujarat directly below the input and above the optional coordinates section.
- Selecting Verāval enables confirmation and draws the selected pin. Confirmation navigated to Dashboard. A separate authenticated `GET /api/location/current` returned HTTP 200, exact coordinates `20.9077, 70.36786`, `is_coastal_supported: true`, and backend coast distance `0.88 km`.
- The pre-confirmation client distance is explicitly labelled approximate. Backend validation remains authoritative; tests retain inland rejection and save-failure coverage.
- Search regression tests cover debounce, keyboard selection, stale-response rejection, cancellation on query changes/unmount, Escape, empty results and retry. No result automatically saves a location.
- Desktop 1280×720 and mobile 390×844 layouts checked in the browser. At 150% text, the location page has document width 390px (no horizontal overflow). After scrolling to `scrollY=844`, the confirmation button remains visible at y=247–319.
- Navigating from that scrolled location page to Settings gives `scrollY=0`. Unit tests preserve explicit hash destinations and avoid resetting query-only changes. Chat scroll now targets its own conversation container rather than scrolling document ancestors.
- Light, Dark and System controls are available in headers and Settings. Default is System unless a saved choice exists. Automated tests verify reacting to OS theme changes and respecting an explicit override.
- Text sizes 90%, 100%, 112.5%, 125% and 150% are saved locally. Browser reload preserved Dark and 150% (root font size 24px). Reset restores 100%. Tests cover limits and corrupt saved values.
- Map and chat rendered successfully in dark mode at 150% mobile text. Public/workspace pixel font sizes were converted to relative units so the setting affects those views too.
- Gujarati mobile location labels and confirmation were rendered and visually checked. New picker and text-size labels cover all eleven supported languages.

## Boundaries and remaining manual checks

- Browser verification used a local Vite frontend and isolated SQLite-backed verification server; no production database was modified. Public geocoding and map tiles were real network requests, not fixtures.
- This does not establish production deployment or provider availability for unrelated features.
- Suggestions depend on Open-Meteo coverage/connectivity; manual coordinates, map selection and explicit GPS remain available. Genuine tile/provider failures are not hidden.
- Physical Android Chrome/microphone acceptance remains on the existing device checklist. Mobile viewport testing is not a substitute for physical-device testing.
