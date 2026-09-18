# PFZ source investigation — 18 September 2026

## Confirmed public evidence

The official INCOIS national overview was manually opened and displayed
`Forecast Date: 18 SEP 2026`, `Valid upto: 19 SEP 2026`:

https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en

Both linked sector pages supplied actual tabular advisory points and a date-only
`TILL 19 SEP 2026` validity label:

- Maharashtra: https://incois.gov.in/MarineFisheries/TextData?secid=SEC002
- Odisha: https://incois.gov.in/MarineFisheries/TextData?secid=SEC010

Columns include landing centre, direction, bearing, distance-from-coast range,
depth range and DMS latitude/longitude. Mumbai/Colaba and Paradip rows exist.
This supersedes any suggestion that public regional advisory coordinates do not
exist. It does **not** mean ORCA currently ingests them.

## Semantics and unresolved contract

- DMS coordinates are point references. They are not polygon vertices or a
  guaranteed fish-presence area.
- Distance `From-To` is a distance-from-coast range, not an advisory circle radius.
- Sector text provides an expiry **date**, not a precise timestamp/timezone.
- A precise sector issue timestamp/revision was not visible. The national issue
  date alone cannot establish that every sector table belongs to that issuance.
- Species names, a geographic search radius and authoritative polygon geometry
  were not established from these tables.
- A reliable automated ingestion contract still needs explicit issue/expiry
  semantics, revision correlation, source attribution and reuse permission.

The official disclaimer was manually checked:
https://incois.gov.in/site/disclaimer.jsp

It states that commercial reproduction is not permitted without permission from
the competent authority. It also explains forecast/model errors and limits of
liability. ORCA's intended reuse/redistribution rights have not been established;
public readability is not an unrestricted commercial license.

## Decision

Keep `Current verified PFZ advisory unavailable` in ORCA for now. Do not copy
these rows into a static demo dataset, infer radius/polygons, or fabricate issue
timestamps. No ingestion or map-popup acceptance is claimed. Ask INCOIS for an
approved feed/reuse scope and the missing validity contract before enabling it.
The official pages remain useful for manual reference; their current publication
is distinct from ORCA's verified-ingestion availability.
