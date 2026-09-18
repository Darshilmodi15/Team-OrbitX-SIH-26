# ORCA data source catalog

Code-reviewed and provider-tested on 18 September 2026. This describes the canonical snapshot and new optional intelligence routes, not every legacy endpoint. Missing values remain null. API availability does not imply a navigational guarantee.

## Marine measurements

| Parameter | Actual provider / upstream | Evidence and resolution | Retrieval and fallback | Limitation |
|---|---|---|---|---|
| Significant wave height, period, direction | INCOIS OSF WW3; Open-Meteo Marine fallback | Numerical model forecast, not a satellite observation; per-value grid coordinates and valid time recorded. Native resolution is not asserted when absent from response. | INCOIS THREDDS catalog `/thredds/catalog/osf/ww3/catalog.xml`, discovered NCSS dataset; fallback `https://marine-api.open-meteo.com/v1/marine` | Coastal grid search is not measurement at the user's exact point; no buoy validation implied. |
| Wind speed/direction/gust | INCOIS model where returned; Open-Meteo atmospheric supplement/fallback | Model wind; atmospheric grid and valid time, km/h and compass degrees | `https://api.open-meteo.com/v1/forecast` | Not an onboard anemometer; wind direction is a from-bearing. |
| Wind-wave height/period/direction; swell height/period/direction | Open-Meteo Marine supplement or fallback, with field-level source retained | Model fields; provider-selected sea cell, timestamp per response | Marine API current/hourly fields | Numerical product selection is provider-managed; do not invent a particular satellite, sensor, or model resolution. |
| Ocean current speed/direction | Open-Meteo Marine | Model current, km/h and provider direction; grid and forecast time | `ocean_current_velocity`, `ocean_current_direction` | Not a spatial current vector field; map displays bearing samples only. |
| Sea surface temperature (SST) | Open-Meteo Marine where supplied | Model output in °C, not a claimed direct satellite reading | `sea_surface_temperature`; unavailable on gaps | A separate satellite SST product is not connected to the canonical value. |
| Visibility, air temperature, weather code | Open-Meteo Weather supplement/fallback | Atmospheric model; km, °C, WMO code | Forecast endpoint above | Missing fields remain unavailable; no direct sensor attribution. |
| Chlorophyll | No connected canonical source | Unavailable | No synthetic fallback | INCOIS may use chlorophyll in its own advisory process; that does not supply ORCA with a measured chlorophyll value. |
| Tides | No authoritative canonical feed configured | Unavailable | No synthetic tide times | Wave/swell periods cannot substitute for tides. |

Marine snapshots bind owner, saved location and requested time. Weather values must have valid provider timestamps, real numeric values, and allowed cache states. Snapshot expiry is five minutes; source freshness and forecast validity are separate. Degraded mode reduces polling without extending safety validity. Existing provider caches may return explicitly stale data; the risk layer retains that status.

Code: `backend/app/data/weather/incois.py`, `open_meteo.py`, `cache.py`, `backend/app/services/marine_snapshot_service.py`, `provenance.py`.

References: [INCOIS OSF](https://incois.gov.in/portal/osf/osf.jsp), [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api), [Open-Meteo Weather](https://open-meteo.com/en/docs).

## Advisories, boundaries and species

| Layer | Provider / endpoint | Semantics, refresh and limitations |
|---|---|---|
| PFZ | Existing INCOIS publication/provider adapter | Requires verified sector points, source, issue and expiry. National publication recency is not local geometry. Emerald pixel halos are symbols; geographic radius/polygon only when explicitly supplied with supported meaning. No current verified points were available during this run. |
| EEZ | Marine Regions / VLIZ WFS `https://geo.vliz.be/geoserver/MarineRegions/wfs`, `MarineRegions:eez`, MRGID 8480 | Reference dataset, World EEZ v12 metadata. Source geometry cached in memory/on disk; no real-time border claim. Map-only topology-preserving simplification uses 0.002° tolerance; original geometry is used for containment/distance. Edges may include coastline, not only international borders. |
| MPA / restricted areas | No verified authoritative geometry connected | Unavailable; no fabricated regulatory polygons. Require licensing/attribution, dates, regulatory meaning and valid geometry before activation. |
| Hazards / risk | ORCA deterministic rules over canonical marine evidence | Derived decision support, not new sensor observations. Snapshot alert count is shown; no affected-area polygon without a source. Experimental Earth Engine evidence does not change the safety rating. |
| Historical marine species | OBIS `https://api.obis.org/v3/occurrence` | Public read access, no key. Bounding box extends roughly 25 km in each direction; capped at 100 fetched rows, 20 species summaries and 100 points. Cache 24 hours; failures 60 seconds. Filters dropped/absent/nonmarine/non-species/invalid/out-of-bounds rows. Counts and latest dates refer only to the returned sample, not the full OBIS database. Includes non-fish marine species. |
| Official species advice | INCOIS Tuna product researched; no current machine-readable local advisory connected | [Tuna Fishery Advisory](https://incois.gov.in/MarineFisheries/TunaAdvisory) returned HTTP 200 and describes satellite-derived SST/chlorophyll/Kd490 inputs and WebGIS/email distribution. Its example maps are not present-day local evidence. The attempted `/MarineFisheries/HilsaAdvisory` URL returned 404; no verified Hilsa endpoint established. |
| Habitat suitability | Normalized contract only | No validated model, score or fish-presence result implemented. `OFFICIAL_ADVISORY`, `HABITAT_SUITABILITY_MODEL`, and `HISTORICAL_OCCURRENCE` must remain distinct. Only historical evidence is emitted by the new service. |

OBIS empty means no usable species records **in this bounded sample**, not absence of marine life. Paradip returned 100 rows from 1,735 matches, but none passed the species/quality filters. Mumbai returned usable historical records. Dataset IDs are retained for attribution; redistribution must respect the original datasets' terms.

References: [OBIS access](https://obis.org/manual/access/), [Marine Regions](https://www.marineregions.org/).

## Earth Engine: coastal and river flood context — experimental

Backend-only credentials; optional authenticated route bound to an owned snapshot. Bounded 3×3 analysis cells of 0.1° around the selected location; reduction sampling scale 1 km; cached one hour. These cells are not flood boundaries, and the finer sampling scale does not increase native rainfall resolution.

| Dataset | Organization / variable | Spatial and temporal meaning | Limitation |
|---|---|---|---|
| `NASA/GPM_L3/IMERG_V07` | NASA GPM; precipitation estimate, mm/h | Native 0.1° (about 11 km), half-hour observation. Latest available image in the preceding 30 days. | Satellite-derived multi-sensor estimate, not forecast or ground gauge. Tested latest observation was 17 September 2026 03:00–03:30 UTC, about 38 hours old. |
| `JRC/GSW1_4/GlobalSurfaceWater` | EC JRC/Google; water occurrence, % | Landsat-derived, 30 m native, 1984–2021 historical summary, sampled at 1 km and averaged into analysis cells | Not present flooding, a floodplain boundary, or tidal inundation. |
| `USGS/SRTMGL1_003` | NASA/USGS; elevation, m | Radar-derived SRTM terrain, approximately 30 m native, February 2000; sampled at 1 km | Not bathymetry; no parcel-level flood depths or storm-surge modeling. Sea-level terrain values must not be interpreted as water depth. |

Catalog: [GPM](https://developers.google.com/earth-engine/datasets/catalog/NASA_GPM_L3_IMERG_V07), [JRC](https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater), [SRTM](https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003).

No river-distance layer, hydrodynamic model, validated exposure score, current flood extent or live flood prediction is connected. Those require scientific validation and additional authoritative data, not just another color ramp.

## Language, connectivity and provenance

BHASHINI uses configured pipeline discovery and inference (`meity-auth.ulcacontrib.org` and `dhruva-api.bhashini.gov.in`); typed language selection includes local script analysis, not a claimed remote language-detection measurement. Real STT/TTS and translation checks are recorded in `verification/feature-integrations-2026-09-18.json`. Synthesized-audio round trips are not human/noisy/code-switch acceptance. Sarvam remains temporary until acceptance. Conversational voice is sequential listen → STT → chat → TTS; no verified streaming partial transcript/full-duplex API is connected.

Connectivity uses browser state, recent API latency/failures, and optional network hints. Server/provider latency can affect the heuristic; it is not a radio-signal-strength measurement. Earth Engine computation time is excluded from speed classification. Offline mode is saved information with expiry, not new connectivity or live data. SMS is an unavailable interface only and would require cellular service and a gateway.

`DataProvenance` retains parameter/value/unit, provider/product, evidence type, nullable satellite/sensor/platform/band, resolutions, sampled coordinates, observation/forecast/retrieval times, source URL and cache state. Numerical models deliberately have null satellite/sensor fields. Important card values and full per-field snapshot disclosures expose provenance. The answer trace contains operational stages/status/provider/time/latency only, never hidden reasoning.
