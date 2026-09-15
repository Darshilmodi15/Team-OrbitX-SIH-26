# Normalized PFZ feed contract

This documents the current ORCA adapter, not an INCOIS-provided API specification. The public WFS is a different schema and cannot be supplied directly as INCOIS_PFZ_API_URL. See [source review](BETA_REVIEW.md).

## Server configuration and requests

`INCOIS_PFZ_API_URL` is a server-side URL to an operator-verified normalized feed. Keep tokens in server secret configuration. `INCOIS_PFZ_TIMEOUT_SEC` defaults to 5 seconds. TLS verification is enabled by default. No feed is currently configured in the inspected local environment.

The adapter sends `sector` and `language` query parameters. An explicit sector must use one of the IDs returned by `/api/pfz/sectors`. An empty sector requests the feed's all-sector publication; do not fabricate all-sector coverage if publications have different validity. Supported language codes are en, hi, gu, mr, ta, te, ml, bn, kn, or and pa. A feed may omit language when its numeric data is language-neutral; if a language is returned it must match the request. This is not evidence every provider supplies every translation.

Clients call `/api/pfz?sector=nicobar&language=en` or supply a complete `lat`/`lon` pair. Invalid codes, incomplete coordinates and out-of-range/nonfinite numbers return 422. Approximate sector hints may require explicit selection; they are not official geographic validation.

## Publication fields

- `source`: nonempty verified provider label. The server operator establishes provenance; a label alone cannot authenticate an arbitrary remote source.
- `data_mode`: live, fresh or cached. Demonstration/mock/synthetic/unavailable/stale input is withheld. `is_demonstration` and `is_mock` must not be true.
- `sector`: must match the requested or resolved sector. Do not attach one sector's measurements to another.
- `language`: optional, but when provided must match the request. See language-neutral limitation above.
- `issued_at`, `valid_until`: ISO timestamps with explicit timezones. Issue must not be future; expiry must be later than issue. Never substitute retrieval time. A passed expiry produces status expired, mode stale and no plotted points.
- `issuing_authority`: optional source attribution; ORCA does not fill missing authority with INCOIS.
- `pfz_zones`: array of point records. Latitude/longitude must be finite JSON numbers in geographic bounds; booleans and numeric strings are rejected. Per-point demonstration/mock records are excluded.
- Optional point metadata: id, landing_centre, distance_km, bearing_deg, depth_m, species. Invalid/missing numbers become null; missing species stays empty. Published harbour distance/bearing is not a vessel-specific route. The assistant bridge calculates straight-line distance from its requested location and omits harbour bearing as a vessel heading.
- `coverage_status: no_advisory_issued` is accepted only with an explicitly empty points array and valid publication metadata. Empty/malformed data without this assertion is a coverage gap, not proof of no official issuance.

## Response and cache behavior

Responses preserve source, normalized issue/expiry, requested sector/language, status and reason_code. Retrieval time is separate. Unconfigured status has null dates, empty points and coverage_status unconfigured. Timeout, HTTP and malformed payload failures retain distinct sanitized reason codes. No upstream response body or secret URL is returned.

Cache keys include sector/language. Current responses revalidate within five minutes or earlier at expiry; failures retry after 30 seconds. One process coalesces concurrent requests per key and returns copies to prevent consumer mutation. This PFZ cache is currently in-process, not shared Redis. Cached current data is labelled cached. Expiry cuts off usable points on both server and client. A retry button does not override the server's revalidation window.

## Required integration evidence

Before enabling a source, retain a sanitized real response, publication source/validity evidence, sector matching evidence, geometry/schema version, reuse terms and a current/expired/failure replay. Tests of constructed payloads validate ORCA's parser, not the provider's operational availability. A line/polygon source requires an additive geometry contract and dedicated adapter; do not flatten it into invented fishing targets.
