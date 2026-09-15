# ORCA Data Source Investigation Guide

> **Purpose:** Step-by-step instructions for each team member to manually verify, register for, and document each data source before Codex/AI writes the adapter. Codex can write the code; you must verify the source.

---

## 1. Open-Meteo Marine (M03 — Pavan)

**Status:** ✅ Working — integrated in [`combined.py`](../backend/app/data/weather/combined.py)

### What exists
- Backend requests wave height, direction, period, wind-wave, swell, SST, currents
- 12 marine fields returned for six reference coordinates
- Cache namespace: `orca:marine:v3:{lat}:{lon}:{date}`

### Manual verification checklist
- [ ] Open https://open-meteo.com/en/docs/marine-weather-api
- [ ] Confirm "Free for non-commercial use" terms apply to hackathon
- [ ] Note rate limits (typically ~10,000 requests/day)
- [ ] Verify attribution requirement: "Weather data by Open-Meteo.com"
- [ ] Test a sample request manually:
  ```
  https://marine-api.open-meteo.com/v1/marine?latitude=20.0&longitude=72.7&hourly=wave_height,wave_direction,wave_period&forecast_days=1
  ```
- [ ] Confirm no API key needed on public endpoint
- [ ] Record: response format matches what `open_meteo.py` expects

### Evidence to record
| Field | Value |
|---|---|
| URL | https://marine-api.open-meteo.com/v1/marine |
| API key needed | No |
| Rate limit | _fill in_ |
| Terms URL | https://open-meteo.com/en/terms |
| Attribution text | _fill in_ |
| Verified by | _name and date_ |

---

## 2. INCOIS PFZ Advisory (M04 — Pavan/Darshil) — Gap C1

**Status:** ❌ Adapter structure exists, no live feed connected

### What exists
- [`incois_pfz_service.py`](../backend/app/services/pfz/incois_pfz_service.py): 14 sectors, validation, unavailable states
- `INCOIS_PFZ_API_URL` env var — defaults to empty → returns "NOT_CONFIGURED"
- Adapter validates: issue date, expiry, coordinates, demo rejection, sector matching

### Manual investigation steps
1. **Open the official advisory page:**
   - https://incois.gov.in/MarineFisheries/PfzAdvisory
   - https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en
   - https://incois.gov.in/MarineFisheries/PfzWebGis

2. **Inspect browser network requests (F12 → Network tab):**
   - [ ] Load the PFZ WebGIS page
   - [ ] Change sector and date
   - [ ] Look for requests ending in `.json`, `.geojson`, `.xml`, `.csv`, `.kml`, WMS, WFS
   - [ ] Click each request → inspect response body
   - [ ] Save a sample response (no credentials)

3. **Document the response format:**
   - [ ] What format is the data? (JSON / XML / GeoJSON / KML / image)
   - [ ] Does it contain an issue date? Field name: ___
   - [ ] Does it contain an expiry date? Field name: ___
   - [ ] Does it contain coordinates? Format: ___
   - [ ] Does it contain sector information? Format: ___
   - [ ] Is it a real advisory or a visualization boundary?

4. **Check access terms:**
   - [ ] Is this a documented public API or an internal browser endpoint?
   - [ ] Does it require authentication or a session cookie?
   - [ ] Is there an official API documentation page?
   - [ ] Check: https://incois.gov.in/gisserver/rest/info

### Evidence to record
| Field | Value |
|---|---|
| Endpoint URL found | _fill in_ |
| Response format | _fill in_ |
| Has issue_date field | _yes/no/field name_ |
| Has expiry field | _yes/no/field name_ |
| Has coordinates | _yes/no/format_ |
| Requires auth | _yes/no_ |
| Session-dependent | _yes/no_ |
| Suitable for automated fetch | _yes/no/why_ |
| Sample response saved to | _path_ |
| Investigated by | _name and date_ |

---

## 3. IMD Warnings and Marine Bulletins (New — Pavan)

**Status:** ❌ Not yet integrated

### Investigation steps
1. **Open official sources:**
   - https://mausam.imd.gov.in/responsive/text_bulletins.php
   - https://mausam.imd.gov.in/imd_latest/contents/index_port.php
   - https://api.imd.gov.in/public/api_reference.html

2. **Check API documentation:**
   - [ ] Does the API reference page describe port warnings?
   - [ ] Does it describe sea-area bulletins?
   - [ ] Does it list available endpoints?
   - [ ] Does it require registration or an API key?

3. **Inspect the bulletin pages:**
   - [ ] Load the text bulletins page
   - [ ] Check Network tab for API requests
   - [ ] Note warning categories (fishermen, port, coastal, cyclone)
   - [ ] Record issue time and validity format

### Evidence to record
| Field | Value |
|---|---|
| API base URL | _fill in_ |
| Endpoints found | _list_ |
| API key needed | _yes/no_ |
| Warning categories | _list_ |
| Has issue/valid times | _yes/no_ |
| Investigated by | _name and date_ |

---

## 4. NASA Ocean Color — Chlorophyll (M05/M42 — Pavan) — Gap C2

**Status:** ❌ Not integrated

### Investigation steps
1. **Choose a product:**
   - Recommended first: MODIS Aqua Level-3 Chlorophyll (mapped, easier to sample)
   - Alternative: VIIRS Level-3 Chlorophyll
   - Portal: https://search.earthdata.nasa.gov/

2. **Register for Earthdata:**
   - [ ] Go to https://urs.earthdata.nasa.gov/
   - [ ] Create a free account
   - [ ] Note: required for data download, not just browsing

3. **Find the dataset:**
   - [ ] Search for "MODIS Aqua chlorophyll Level 3"
   - [ ] Record the dataset ID (e.g., `MODISA_L3m_CHL`)
   - [ ] Note the spatial resolution (e.g., 4km, 9km)
   - [ ] Note the temporal resolution (daily, 8-day, monthly)

4. **Test a download/query:**
   - [ ] Try the Ocean Color API: https://oceandata.sci.gsfc.nasa.gov/api
   - [ ] Try OPeNDAP subset for a small Indian Ocean bounding box
   - [ ] Record the file format (NetCDF, HDF, PNG)
   - [ ] Check quality flags and cloud mask fields

### Evidence to record
| Field | Value |
|---|---|
| Product name | _fill in_ |
| Dataset ID | _fill in_ |
| Earthdata account | _created yes/no_ |
| Spatial resolution | _fill in_ |
| Temporal resolution | _fill in_ |
| Download method | _API/OPeNDAP/HTTP_ |
| Quality flags available | _yes/no/names_ |
| Cloud mask field | _fill in_ |
| Sample file saved to | _path_ |
| Investigated by | _name and date_ |

---

## 5. NOAA ERDDAP — SST and Currents (Alternative — Pavan)

**Status:** ❌ Not integrated — simpler alternative to MOSDAC for SST

### Investigation steps
1. **Browse datasets:**
   - SST: https://coastwatch.noaa.gov/erddap/info/noaacwBLENDEDsstDNDaily/index.html
   - Currents: https://coastwatch.noaa.gov/erddap/info/noaacwBLENDEDNRTcurrentsDaily/index.html
   - General: https://www.ncei.noaa.gov/erddap/index.html

2. **Test a subset query:**
   ```
   https://coastwatch.noaa.gov/erddap/griddap/noaacwBLENDEDsstDNDaily.json?
   analysed_sst[(last)][(19):(21)][(72):(74)]
   ```
   - [ ] Try the URL above (adjust as needed)
   - [ ] Record response format (JSON/CSV/NetCDF)
   - [ ] Note variable names (e.g., `analysed_sst`, `analysis_error`)
   - [ ] Confirm no API key required

3. **Check terms:**
   - [ ] NOAA data is generally open — confirm for specific dataset
   - [ ] Note attribution requirement

### Evidence to record
| Field | Value |
|---|---|
| Dataset ID | _fill in_ |
| Variable names | _fill in_ |
| Resolution | _fill in_ |
| No API key required | _yes/no_ |
| Response format tested | _fill in_ |
| Indian Ocean coverage | _yes/no/bounds_ |
| Investigated by | _name and date_ |

---

## 6. MOSDAC / ISRO (M05 — Pavan) — Gap C2

**Status:** ❌ Stub returns NOT_IMPLEMENTED

### Investigation steps
1. **Check the portal:**
   - https://www.mosdac.gov.in
   - https://www.mosdac.gov.in/pfz/
   - https://www.mosdac.gov.in/global-ocean-surface-current

2. **Registration:**
   - [ ] Does MOSDAC SSO registration exist?
   - [ ] Is it free for research/hackathon use?
   - [ ] What products are accessible after registration?

3. **Identify a specific product:**
   - [ ] Ocean surface currents?
   - [ ] SST from INSAT-3D?
   - [ ] Chlorophyll from OCM?
   - [ ] PFZ-related products?

4. **Check download API:**
   - [ ] Read https://www.mosdac.gov.in/downloadapi-manual
   - [ ] Note: a `MOSDAC_API_KEY` alone does not prove data access
   - [ ] Test an actual download for one product

### Evidence to record
| Field | Value |
|---|---|
| Product selected | _fill in_ |
| Registration required | _yes/no_ |
| Registration completed | _yes/no_ |
| Download API tested | _yes/no_ |
| Data format | _fill in_ |
| Free for hackathon | _yes/no_ |
| Investigated by | _name and date_ |

---

## Recommended Implementation Order

```
1. Open-Meteo Marine     ✅ DONE — verify terms and attribution
2. IMD Warnings          🔲 NEXT — separate from forecast values
3. INCOIS PFZ            🔲 Investigate actual endpoint format
4. NASA/NOAA SST+Chl     🔲 Pick one product, register, test
5. MOSDAC                🔲 Only after confirming access and product
```

## Rules for Giving Tasks to Codex

After investigating a source, give Codex:
1. ✅ The confirmed endpoint URL
2. ✅ A saved sample response
3. ✅ Meaning of each field
4. ✅ Rules for missing or expired data
5. ✅ Desired output format for ORCA

Do NOT ask Codex to:
- ❌ "Find live data automatically"
- ❌ "Connect to INCOIS" (without specifying which endpoint)
- ❌ Decide whether old data is acceptable
- ❌ Determine if a source allows redistribution
- ❌ Replace a missing value with another city's data
