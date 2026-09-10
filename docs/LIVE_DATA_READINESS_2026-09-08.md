# ORCA: real-data verification and internal-round readiness

Checked 8 September 2026. Read-only audit of public production APIs, direct public INCOIS requests, and current source code. Existing local fixes are not assumed deployed. No private accounts, paid AI calls, production edits, commit or push were used for this audit.

## Verdict

**Yes: the checked production wave height, wind speed and wind direction match a real INCOIS WW3 forecast response. No: ORCA as a whole cannot yet be described as entirely live or free of synthetic values.** Important active fallback and advisory paths still contain fabricated data. Several unavailable integrations are now correctly disabled. The earlier broad audit missed some of the issues below; this report supersedes any implication that all fabricated paths were already removed.

INCOIS OSF/WW3 is a numerical forecast product. A request made now retrieves provider forecasts; it is not a physical sensor measuring the user's precise position continuously. See [INCOIS wave-model description](https://iioe-2.incois.gov.in/site/datainfo/modelling/ww3.jsp) and [official operational forecast services](https://www.incois.gov.in/site/services/rsmc.jsp).

## Direct proof: provider versus production

Public offshore test points were used, not personal GPS. The configured catalog returned HTTP 200. Current selection was `osf/ww3/rsmc_combined_ww3_20260907.nc`; CSV forecast valid time was **2026-09-08 15:00 UTC / 20:30 IST**. Production retrieval was around 15:09–15:10 UTC.

| Field | Veraval-area raw INCOIS (20.9, 70.3) | ORCA production | Mumbai-area raw INCOIS (18.9, 72.7) | ORCA production |
|---|---:|---:|---:|---:|
| Significant wave height, m | 1.317700386 | 1.32 | 1.320211887 | 1.32 |
| Zonal wind component U | 5.560758591 | Used in conversion | 5.046518326 | Used in conversion |
| Meridional wind component V | -0.122890428 | Used in conversion | -2.016265631 | Used in conversion |
| Wind speed, km/h | Computed from U/V | 20.0 | Computed from U/V | 19.5 |
| Wind direction | Computed from U/V | 271.3°, W | Computed from U/V | 291.8°, WNW |

The two wave heights round to the same displayed value; that does **not** make them hardcoded. The raw values and wind vectors differ. ORCA calculates wind magnitude with `sqrt(U²+V²)`, rounds m/s to two decimals, then multiplies by 3.6. Direction is calculated from the vector. These are legitimate transformations, not invented readings.

The direct NCSS request uses `var=HS,UWND,VWND`, latitude, longitude and CSV output at `https://incois.gov.in/thredds/ncss/grid/` plus the dataset path. Raw CSV and production JSON are saved in [the evidence folder](data-audit-evidence-2026-09-08/). Public service responses matching here establish those requests only; they do not prove uptime or every location.

## What you can and cannot claim at the round

| Feature | Verified status | Accurate presentation wording |
|---|---|---|
| Wave height and wind vector | Direct INCOIS/production match at two sites | “Location-based INCOIS WW3 forecast data, with source and valid time.” |
| Wind speed/direction | Calculated from real provider components | “Derived from the INCOIS wind components.” |
| SST, visibility, wave period, gusts via current INCOIS adapter | Null in checked production output; only three variables requested | “Not integrated in this adapter yet.” |
| Multi-hour forecast | Production HTTP 200 with empty horizon | “Forecast time-series integration pending.” |
| Tomorrow's conditions | Requested date does not select tomorrow's data | Do not demonstrate current values as tomorrow's forecast. |
| PFZ | HTTP 200, explicit unavailable mode, zero zones | “Verified current PFZ feed pending.” Zero returned zones does not prove there are no official advisories. |
| Tide | HTTP 503, TIDE_FEED_UNAVAILABLE | “Tide feed not connected.” |
| Chlorophyll/ocean analytics | HTTP 503, SATELLITE_OBSERVATIONS_UNAVAILABLE | “Satellite analytics not currently connected.” |
| Government announcements/documents | HTTP 200, empty arrays | “No verified records currently supplied.” |
| Risk/safe-to-sail | ORCA rules, estimated inputs and fixed scores | Not an INCOIS safety clearance. Needs correction before presenting as reliable safety guidance. |
| SOS | Database receipt; no rescue dispatch integration verified | “SOS submission recorded in ORCA.” |
| AI answers | Generated from supplied evidence and model knowledge | Do not call every sentence an INCOIS fact. |

## Must fix before the internal round

### P0 — active fabricated or overconfident output

1. **Fallback weather fabricates measurements.** `backend/app/data/weather/open_meteo.py` substitutes **1.10 m waves**, **18 km/h wind**, gusts at **1.35× wind**, **15 km visibility**, zero precipitation and **air temperature +0.6°C or 28°C SST** when fields are missing. It marks the combined result `is_mock=False`. This is reachable from the default INCOIS provider when no INCOIS/cache result exists. A successful alternate API response is not enough to validate these filled fields. Remove substitutions; missing fields must remain null. Keep Open-Meteo clearly identified as the actual source. Confirmed by code; live failure was not forced against production.

2. **Fixed advisories masquerade as current INCOIS/government notices.** `backend/app/services/notifications/notification_service.py` constructs global notices at startup: “1.2m–1.8m today,” new PFZ releases, and a boundary notice attributed to government sources. All receive the current timestamp without a bulletin fetch. Stop seeding them in production. This service is mounted by the API; its visibility in the current page was not assumed from its existence. No private notification records were queried.

3. **Risk calculations invent missing inputs and imply official certainty.** `backend/app/agents/risk_agent.py` defaults wave period to **7 seconds**, gusts to **1.3× wind**, and no horizon to “stable.” It uses fixed component scores such as **0.2**, calls unknown storm conditions “Clear sky,” and returns “HIGH (Authoritative INCOIS Model Coverage).” The production endpoint actually returned “SAFE TO SAIL,” “Conditions are optimal,” “Light gusts” and “Clear sky” while gust data was null. Preserve unknown components, label scores as ORCA heuristic output, and remove unsupported official-confidence/clearance claims. Thresholds are allowed as documented model rules; they are not measurements.

4. **No-data output contains zero measurements.** `incois.py` returns wave and wind **0.0** when both providers fail; `weather_agent.py` also defaults missing wave/wind to zero. The current frontend detects some unavailable flags, but downstream API/risk consumers can still interpret zero as calm. Use nullable measurements or an explicit failure contract all the way through.

5. **Zone-avoidance can say ALL_ZONES_CLEAR without comprehensive evidence.** Production `/api/analytics/zone-avoidance` returned this status with empty avoided/alternative lists. `ocean_analytics_agent.py` also has no-weather defaults **1.2 m**, **20 km/h**, “clear.” No detected restriction is not proof that all grounds are safe. Require sufficient source coverage or return unknown/partial assessment.

### P1 — time, cache and provenance correctness

6. **Tomorrow query returns today's data.** An actual request with `date=2026-09-09` returned forecast time `2026-09-08T15:00:00Z`. The NCSS request never sends a requested time, takes the first CSV row, and cache keys omit date. Select and validate forecast time explicitly before showing future advice.

7. **Cache freshness means fetch age, not forecast age.** `cache.py` treats retrieved content as fresh for **3 hours**, stale for up to **24 hours**, regardless of forecast valid time. `data_age_sec=0` means just fetched, not “observed this instant.” Missing forecast timestamps are replaced by now. Keep issue/valid/retrieval timestamps separate and never invent a missing source time.

8. **Frontend mislabels a cached response as live.** `frontend/src/lib/orca/marine.ts` checks `cache_status === "hit"`, but the backend sends `"cached"`. Cached INCOIS responses can therefore become `dataMode: "live"`. Correct the contract and test both first fetch and repeat fetch.

9. **Dataset choice is lexical, not chronologically robust.** `discover_latest_dataset()` sorts entire paths, so combined datasets sort after coastal datasets even if an older date. Fallback fabricates a dataset path convention, not measurements, but may query nonexistent data. Parse dates and coverage; record selected dataset identity. Current checked path was genuine and returned data.

10. **Spatial resolution is not exact personal GPS accuracy.** Requests round coordinates to three decimals; cache keys group at **0.05°** and land-mask handling searches neighboring ocean points. “exact” means the first request returned data, not necessarily that a sensor exists at that coordinate. Display requested versus model grid position and nearest-cell method. Nearby positions can legitimately share a forecast.

11. **Open-Meteo forecast indexing is wrong for “next hours.”** The fallback takes hourly array indexes 1–6 without aligning them to current time and fills missing hours with repeated current values/estimated gusts. Select by the provider's time array and preserve gaps.

12. **History labels retrieval as observation.** `incois.py` persists forecasts through `MarineObservationRepository.record_observation()` without passing forecast valid time. The repository defaults to the insertion time. Repeated collection can turn the same model forecast into apparent new observations. Preserve valid time, source dataset and retrieval time; deduplicate by source/time/grid. Do not use legacy rows as verified trend evidence before provenance review.

13. **Chat “LIVE” is not source verification.** `main.py` starts connectivity mode at LIVE even without weather evidence, and model-generated guidance is not independent provider confirmation. Label answer evidence separately from network availability. Prevent unsupported safety statements when essential evidence is absent/stale.

14. **TLS verification is disabled in the INCOIS adapter.** `verify_ssl=False` is the default. Direct public requests with certificate verification enabled succeeded in this audit. Enable verification and handle genuine certificate failures rather than silently weakening provider authenticity.

## Static code that needs classification, not indiscriminate deletion

- Port names, emergency contact directory, geographic geometry, unit conversion factors and risk thresholds can be legitimate reference/configuration data. They need source/version/date and appropriate labels, not random replacement with APIs.
- `marine_boundaries.py` has an embedded fallback EEZ polygon; seeded geofences include hand-entered coordinates. These must not become official navigational/legal clearance. The polygon's accuracy and government authority have not been certified here.
- `frontend/src/lib/orca/assistant.ts` and `DialogueSynthesizer._synthesize_deterministic` retain fake baseline readings/templates. Current AssistantPage does not call the former, and the synthesis failure path does not call the latter. Remove/quarantine as dead code to prevent accidental reactivation, but don't misreport them as the cause of every current reply.
- Chlorophyll/productivity helpers retain fixed values (including +0.85°C anomaly) and regional narratives. Their primary analytics endpoints are disabled; the separate zone-avoidance function remains active and is listed above.
- `FishAnalyticsModal.tsx` contains +0.85°C; no current import/mount was found in the searched TSX tree. Treat as dormant UI, not verified visible production output.
- `/thank-you` is an active route that generates a random transaction ID and claims a receipt was sent without receipt verification. Restrict it to a real confirmed submission or remove unsupported success claims.
- `MockWeatherProvider` generates synthetic data. The default INCOIS wrapper rejects explicit mock fallback output, but Open-Meteo's mixed real/synthetic success path still evades that guard.
- Decorative random wave animation is visual design, not scientific data. It can remain if it is not represented as a live sea-state visualization.
- Explicit what-if simulation is computed hypothetical output. Keep it clearly separate from provider forecasts.

## Practical 2–3 day plan

**Day 1:** Remove mixed synthetic fallback readings and seeded notices; guard unavailable risk/zone outputs; fix cached/live status. Verify provider-down, missing-field and stale-source cases with isolated tests.

**Day 2:** Make the presentation show source, forecast valid time and cached status beside actual wave/wind values. Fix requested-time selection or disable tomorrow/time-series claims. Recheck the deployed build at two public coastal sites against raw provider CSV.

**Day 3 / rehearsal:** Demonstrate only the verified subset. Keep honest unavailable states for PFZ/tide/satellite products. Test sign-in, English and one regional-language query, provider outage, location change and SOS receipt. Do not present SOS receipt as dispatched rescue. Prepare the saved provider/production comparison as technical evidence.

A defensible presentation sentence is: **“ORCA integrates INCOIS WW3 location-based wave and wind forecasts and derives wind magnitude/direction. We show source time and cache state; PFZ, tide and satellite analytics integrations are pending.”** Only claim the source-time/cache-state UI portion once the identified display bug is fixed and the deployed build is verified.

## Scope and evidence limits

This audit establishes the two sampled production/provider matches and the listed source-code paths. It does not certify every location, every failure mode, private production database contents, all deployed code parity, source-data accuracy, or continuous uptime. Production was not modified or stress-tested. No fresh full test suite was run because this task added an audit report/evidence rather than application changes. Existing pending local fixes remain untouched.
