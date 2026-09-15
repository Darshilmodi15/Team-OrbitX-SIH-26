# Harpal — Maps, layers and geographic evidence

## Outcome and ownership

Map, satellite and text modes communicate the same selected location and advisory, with useful overlays that have real data. Own `CoastMap.tsx`, `MapPanel.tsx`, map layer copy and GIS rendering utilities. Coordinate PFZ schema with Darshil and picker behavior with Heth before editing their files.

## Build in order

1. Preserve parent-controlled PFZ sector selection across map, satellite and text. Support explicit fit-to-advisory, location recenter, legend and layer source/age. Changing basemap must not clear overlays or imply satellite imagery itself supplies ocean measurements.
2. Render actual PFZ lines/polygons only after Darshil supplies verified geometry and publication metadata. Distinguish provider coverage, PFZ advisory geometry, EEZ and international maritime boundaries. Approximate sector boxes are selection hints; EEZ is not interchangeable with every navigation restriction. Source legal/reference layers and annotate limitations, disputes, age and missing coverage.
3. Compare retaining Leaflet with Google Maps JavaScript API using actual locale, India/island coverage, mobile performance, attribution, cost and quota tests. Google supports language/region options but does not supply ORCA's PFZ, chlorophyll or IMBL overlay. Prepare a working bounded proof and cost estimate before proposing a provider migration; retain a text fallback.
4. Coordinate SST/chlorophyll/wave overlays with Pavan. WMS imagery and sampled numeric values are different products and must have compatible timestamps/legends; do not sample a screenshot's colours into authoritative measurements. Avoid overlapping basemap requests, leaked keys or unrestricted referrers.
5. Explain tile/provider errors without removing advisory text. Test loading at low bandwidth, mobile controls, keyboard use, labels in all supported languages and retained user zoom during background updates.

## Acceptance

Rendered browser proof of each layer independently in map and satellite modes, source/age and legend, absent/expired layer handling, sector switching, island extent, Rameswaram/Kanyakumari, fit/recenter and tile failure. No invented buffers, marine boundaries or “safe route” claims. Provide asset licensing and permitted offline caching rules to Prachi.

## Working agreement

Repository: `Darshilmodi15/Team-OrbitX-SIH-26`. Product: `https://team-orbit-x-sih-26.vercel.app`. The separate `dhrubojyotihazra/ORCA` repository is a competitor reference. Start by reading current `AGENTS.md`, `docs/PHASES.md` and `docs/BETA_REVIEW.md`; inspect current code before implementing because another teammate may already have changed it. This brief defines proposed work, not features that already exist.

Use a separate branch and PR for one reviewable milestone. Preserve other owners' interfaces; agree on shared changes with Darshil before merging. Never commit secrets. Public provider fixtures belong only in tests and must be labelled. Unknown readings stay null, retrieval time stays separate from observation/forecast/publication time, and stale data never becomes live after a cache hit. Keep private locations, chat and SOS scoped to the authenticated account. Do not merge or deploy another owner's changes as part of your work.

Deliver code, meaningful failure-path tests, browser evidence for the changed user flow, a short operator setup note, exact required environment variable names without values, and a rollback note. Passing mocked tests or a build is not proof of live provider access. State separately what was verified against an actual provider, local API, rendered browser and deployed build.
