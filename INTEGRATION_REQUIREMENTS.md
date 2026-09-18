# Feature-depth integration requirements

Audit: 18 September 2026. Credentials are checked for presence only and are never copied here.

| Integration | Current evidence | Required action |
|---|---|---|
| Leaflet | Existing renderer, standard OSM and Esri reference imagery | Retained by user decision. No Google Maps key, billing account, or migration required. |
| Earth Engine | User confirmed `team-orbitx-sih26` (project number `795586847632`). API enabled; local Application Default Credentials completed actual Mumbai and Paradip queries. Quota API returned monthly effective limit 3,600,000 EECU-seconds and 6,000 read requests/minute/project and /user. | Configure a dedicated backend identity on Render; set `EARTH_ENGINE_PROJECT` server-side. Verify noncommercial registration/eligibility and remaining usage in Console. No new Google Maps key required. |
| BHASHINI | User/API/inference credentials and pipeline configuration present. Existing primary language adapter. | Exercise actual target-language matrix. Human noisy/long/code-switched recordings and native-speaker review remain required. Keep Sarvam until acceptance. |
| Sarvam | Temporary provider and credential present | Do not remove credentials or adapter before BHASHINI acceptance. |
| OBIS | Public v3 occurrence request succeeded; no API key | Bounded geographic requests, cached results, historical evidence labels and original dataset attribution. |
| INCOIS | Existing OSF and PFZ publication adapters | Current verified sector geometry/species advisory requires an actual licensed/accessible machine-readable product. A national publication date does not establish local PFZ coordinates. |
| MPA / restrictions | No verified local protected-area feed identified | Supply a permission-compatible authoritative geometry source with dates and citations before enabling regulatory polygons. |
| SMS | No gateway established | Interface only; cellular availability is required for any future near-shore SMS delivery. |

Earth Engine access, quotas and eligibility cannot be inferred from a welcome screen. Experimental rainfall/water/terrain context is not validated flood prediction and does not modify the marine safety classification.

## Earth Engine deployment steps (not yet applied)

1. Open the Earth Engine configuration for `team-orbitx-sih26`; confirm the project's noncommercial registration and eligibility. The quota limit is consistent with the published Contributor tier, but does not independently prove eligibility or remaining balance.
2. Arrange a dedicated server identity with least-privilege Earth Engine read/compute and Service Usage Consumer permissions on this project. Prefer workload identity federation if supported by the hosting setup. Do not grant project Owner solely for this feature.
3. If a service-account credential file is required, provision it through Render's secret-file mechanism, outside source control. Point backend-only `GOOGLE_APPLICATION_CREDENTIALS` to that mounted file. Do not upload your personal local ADC file to the server or paste credentials in chat.
4. Set backend `EARTH_ENGINE_PROJECT=team-orbitx-sih26`; deploy the requirements including `earthengine-api` and `shapely`.
5. Verify an authenticated `/api/intelligence/earth-observation?snapshot_id=<owned snapshot>` call on the deployed backend and the deployed map. Local success is not deployment proof.
6. Monitor Earth Engine compute usage. The 18 September quota read returned 1,000 EECU-hours/month; remaining usage was not retrieved. Public documentation says reaching the monthly tier allowance reduces performance/throughput; it is not necessarily a hard stop.

Read-only quota audit endpoint: `https://serviceusage.googleapis.com/v1beta1/projects/795586847632/services/earthengine.googleapis.com/consumerQuotaMetrics`. No billing or IAM changes were made.

References: [noncommercial tiers](https://developers.google.com/earth-engine/guides/noncommercial_tiers), [usage quotas](https://developers.google.com/earth-engine/guides/usage), [service accounts](https://developers.google.com/earth-engine/guides/service_account).
