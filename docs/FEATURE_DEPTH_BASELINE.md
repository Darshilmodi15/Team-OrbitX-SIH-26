# Feature-depth baseline

- Captured 18 September 2026 before implementation.
- Clean source checkpoint (frontend and backend): `ccae56034e238f4ea13675ed0222c6e3af2554ad`.
- Original branch: `codex/chat-map-redesign`.
- Working branch: `codex/feature-depth-leaflet`.
- Frontend regression baseline: 146 passed, 27 files.
- Backend regression baseline: 476 passed, 12 failed, 5 skipped. The twelve Google-auth failures were traced to existing tests polluting `sys.modules['google']`; test-isolation fixes restore the real namespace after each Gemini mock.
- Vercel production: `dpl_AGDML3V1Tx5NJY1nLSNHjQMDL8uK`, READY, inspected live. Deployment metadata SHA is not supplied by this inspect response.
- Render public health: HTTP 200, `healthy`. Last repository-recorded deployment: `dep-dal5ep4s728c7396o0ng`, SHA `c69ff4f`; historical, not a refreshed deployment assertion.
- Configured PostgreSQL schema: read-only query returned `0006_google_identity`.

The baseline commit remains recoverable. No production migration or deployment is part of this checkpoint. Leaflet retention supersedes the pasted Google Maps spike. The earlier poster task is superseded by this feature-completion brief.
