# Beta review — 13 September 2026

## Baseline and scope

Reviewed main at `64d303d`, also origin/main at inspection. The user confirmed this branch contains all their work. The latest GitHub PR visible was the older closed PR #2; this review therefore used the current commit rather than assuming the PR represented the new work. Preserve the user's changes and accept one phase at a time. Current repairs are local; no deployment or push is implied.

## Confirmed code findings and local repairs

| Finding | Repair / remaining boundary |
|---|---|
| PFZ selector changed the card but map used a different query | Parent selection is passed to both; sector, coordinates and UI language participate in the same query key |
| Backend stale advisories displayed as generic unavailable | Expired status survives frontend normalization and points are withheld |
| Missing/invalid feed points implied no official advisory had been issued | Only explicit, timestamped empty-publication status means no advisory; retrieval failures remain coverage unavailable |
| Parser accepted ambiguous dates and incomplete provenance | Explicit timezone, source, live/fresh/cached mode, requested sector and matching language are validated; demonstration data and malformed points are rejected |
| Cache ignored language and held mutable data until expiry | Sector/language keys, per-key fetch lock, copied payloads, five-minute maximum revalidation and expiry cutoff; failures retry after 30 seconds |
| Catalogue conflated southern/northern mainland sectors and island groups | 14 names; bounds marked approximate ORCA selection hints, overlap requires manual sector selection. These boxes are not official GIS boundaries |
| PFZ agent used nullable harbour distance as vessel distance and guessed provenance from the name | Compute geodesic distance from requested location; retain explicit source. Published harbour bearing is not exposed as vessel heading |
| PFZ recommendation invented depth, suitability, CPUE and route clearance | Missing depth/species remain unknown; no catch score or safe-route claim from PFZ presence |
| MOSDAC client invented `/api/ocean/point`, bearer auth and observation time | Disabled unsupported fetch; status explicitly says dataset ingestion is not implemented. No imaginary API-key setup |
| Redis connection failure could log the credential-bearing URL | Log only exception class and fallback status |

This review does not certify other recommendation branches, routing, ecology, tide or satellite analytics as beta-ready. Further evidence review is required before releasing them as operational advice. The location gate, manual pin flow, localized sector names, full GIS boundaries and rollback drill remain work items. The offline pack now has a local core implementation with device acceptance pending; see [Phase 3](PHASE3_OFFLINE.md).

## Actual PFZ source investigation

The official [INCOIS PFZ explanation](https://incois.gov.in/MarineFisheries/PfzAdvisory) lists 14 sectors. The [official MFAS geoportal](https://incois.gov.in/geoportal/MFASPFZ/index.html) client references GeoServer WFS `PFZ_Automation:pfzlines`, plus separate WMS sector, EEZ, landing-centre, SST and chlorophyll layers.

A bounded read-only WFS GetFeature request (`service=WFS`, `version=1.1.0`, `typeName=PFZ_Automation:pfzlines`, `outputFormat=application/json`, `maxFeatures=2`) to `https://incois.gov.in/geoserver/PFZ_Automation/ows` returned two MultiLineString features, with 55 total reported. Properties included State_Name, Julian_day, Year and UID. The response timestamp was `2026-09-13T15:37:04.527Z`; it is retrieval metadata, not advisory issuance. The inspected features contained no valid-until timestamp.

**Not connected:** the normalized adapter expects published point records with explicit issue/expiry; it cannot be configured directly with this WFS. Next step is matching geometry to official bulletin validity and implementing a source-specific geometry adapter. Never infer expiry or treat individual line vertices as independent issued targets. The public endpoint's availability does not itself establish a bulk-polling agreement or service guarantee.

## Provider decisions to validate next

| Need | Evidence and next decision |
|---|---|
| Waves, swell, period/direction, SST and ocean currents | [Open-Meteo Marine documentation](https://open-meteo.com/en/docs/marine-weather-api) lists these model products. Expanded adapter and mixed-provider provenance are implemented locally; see [Phase 2A](PHASE2_MARINE.md). Non-commercial hackathon use is confirmed, so no public-endpoint API key is required; quotas and attribution still apply |
| Chlorophyll | [Copernicus global ocean-colour NRT](https://data.marine.copernicus.eu/product/OCEANCOLOUR_GLO_BGC_L3_NRT_009_101/description) is a candidate. Requires dataset ingestion, cloud/quality filtering and dated sampling; not interchangeable with a forecast or basemap |
| MOSDAC | [Official download API manual](https://www.mosdac.gov.in/downloadapi-manual) documents account-based dataset search/download. Select a dataset and implement ingestion; there is no verified point endpoint in ORCA |
| Tide predictions | [NOAA CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/) is station-based and not a general Indian-coast replacement. [Open Waters](https://openwaters.io/api/tides) advertises global harmonic predictions, so it should not be dismissed as US-only, but Indian station coverage and datum still need testing |
| Additional commercial marine coverage | [Stormglass](https://stormglass.io/) is a candidate if coverage, field provenance, latency and account costs justify it; no integration or access verified |
| Translated map labels | [Google Maps localization](https://developers.google.com/maps/documentation/javascript/localization) supports language/region parameters. It still requires ORCA's separate marine/PFZ/boundary layers. Compare a bounded proof before migrating; enabled API, restricted key, billing and budget are operator prerequisites |

## What a human needs to provide or do

1. **PFZ:** no invented credential request. First finish the public publication/expiry linkage above. If access is restricted, Darshil needs the official operational-feed access/contact agreement and a real schema/sample with validity. Do not paste passwords in a task or source file.
2. **Redis:** local `.env` contains REDIS_URL, but the bounded local ping failed with ConnectionError. That is not evidence the deployed backend cannot connect: the configured hostname appears to be an internal service address. The hosting operator must verify connectivity from the backend service; use the private endpoint on its network or an authenticated external/TLS endpoint for approved local access. Set the secret through the host's secret settings. Prove a cache hit across two workers before calling it shared Redis. No database rows need to be copied to Redis by default; only appropriate public provider payloads belong in this cache.
3. **PostgreSQL:** DATABASE_URL is present; presence is not connectivity, schema or backup verification. Before beta promotion, the operator and Rajvi must record migration state, verify chat with the deployed schema, and test a restore/rollback-compatible deployment. This review did not migrate the production database.
4. **Satellite data:** Pavan first selects a product and verifies its access process. MOSDAC account/download access or Copernicus access may then be needed. Supplying `MOSDAC_API_KEY` to the old stub would not fix missing ingestion.
5. **Google Maps:** optional, not required for the PFZ repairs. Only after Harpal's comparison: create/choose the cloud project, enable the chosen API, configure billing/quota and restrict the browser key to approved referrers/APIs. No account was created or charged here.
6. **Voice and AI:** configured keys do not prove available quota. Verify an actual authenticated chat and STT/TTS request on the release candidate; the account owner may need to add provider credits if the actual response reports insufficient quota. Do not infer this from an old failure.
7. **Field validation:** arrange native-language review and a few realistic coastal-user tasks before claiming all 11 languages and onboarding are ready.

## Team handoff

See [six detailed briefs](team/README.md). No teammate messages were sent. Each brief defines ownership, ordered work, interfaces, failure tests, evidence and handoff. Darshil integrates one milestone at a time; independent investigations can proceed without mixing unverified features into the candidate release.

## Verification ledger

Focused review checks: 40 backend tests and 81 frontend tests passed. The full run had 406 passes, 5 skips and one obsolete recommendation assertion; after its correction, the affected suites passed 49 tests. Build passed and lint exited 0 with existing warnings. See PHASES.md for exact scope. Tests use explicitly isolated provider fixtures; they do not establish operational PFZ or MOSDAC connectivity. No authenticated deployed end-to-end success or beta-readiness claim is made by this review.

### Rendered local browser check

An isolated, explicitly labelled component harness used public Mumbai reference coordinates and the real local PFZ router. Browser selection of Nicobar produced `GET /api/pfz?sector=nicobar&language=en` HTTP 200. Map and satellite modes rendered; switching modes retained the selection, text mode removed imagery, and text preference survived reload. Unknown source/issue/expiry remained blank and there were zero fabricated PFZ points. The harness contained only the PFZ router, so geofence requests returned 404; this check does not verify geofence layers. The temporary page was removed and its servers stopped after review. This was not an authenticated production-flow test.
