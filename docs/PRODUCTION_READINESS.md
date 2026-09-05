# Production readiness inventory

This inventory distinguishes intentional demo/test fixtures from values that must be supplied by deployment configuration.

## Deployment configuration

| Value | Current location | Production action |
| --- | --- | --- |
| Frontend API origin | `frontend/.env.production`, `frontend/src/services/api.ts` fallback | Set `VITE_API_BASE_URL` in the deployment environment. The source fallback is retained only as a last-resort compatibility path. |
| Backend CORS origins | `backend/.env.example` and backend settings | Set `FRONTEND_ORIGIN`/`FRONTEND_ORIGINS` to the deployed frontend origins. Never use `*` with authenticated requests. |
| JWT signing secret | Backend settings fallback `development-only-change-me` | Provide a long, random `JWT_SECRET_KEY`; production startup rejects the development fallback. |
| Sarvam and Bhashini credentials | `SARVAM_API_KEY`, `BHASHINI_*`, `ULCA_API_KEY` | Store in the deployment secret manager. Do not expose them through `VITE_*` variables. |
| Weather, ocean, alert, and map providers | Backend provider settings and `.env.example` | Configure provider URLs, credentials, timeout, and freshness settings per environment. |
| Database and Redis | `DATABASE_URL`, `REDIS_URL` | Use managed production services and run migrations before serving traffic. |
| Google authentication | `VITE_GOOGLE_CLIENT_ID` and backend Google auth route | Configure both sides only after server-side ID-token verification is enabled; the endpoint intentionally returns unavailable until then. |

## Intentional defaults and fixtures

| Value | Current locations | Notes |
| --- | --- | --- |
| Mumbai/Mumbai Port (`18.9220, 72.8347`) | Marine API defaults, onboarding/demo flows, tests | Demo and fallback coordinates. Production requests should provide the user's verified location. |
| Dahanu (`19.9700, 72.7300`) | `POST /api/demo/dahanu` | Guided SIH demo fixture; do not use as a live user location. |
| Demo credentials (`password123`, `govpassword123`, `adminpassword123`) | Development seed and auth tests | Development-only fixtures. Demo account seeding is disabled in production. Rotate or remove before any shared staging environment. |
| Local origins (`localhost:8000`, `localhost:5173`, `localhost:3000`) | Local env examples, tests, and development error messages | Expected for local development only. |
| Synthetic marine observations and advisories | Agent/provider fallback modules and tests | Must be labelled as fallback/simulated data in user-facing responses; never present them as live INCOIS observations. |

## INCOIS and public-data integration

INCOIS-facing adapters are configuration-driven. Production deployment must provide the approved INCOIS/public feed URLs, credentials where required, attribution, cache/freshness policy, and an outage fallback. The UI should continue to show source, retrieval time, and stale/unavailable status so an operator can distinguish live observations from deterministic fallback data.

## Completed hardening

- Sarvam language-detection metadata now reaches `/api/detect-language` even when the service is injected or mocked without a configured API key.
- The authentication screen no longer presents an inactive password-reset control as if recovery were available.
- Frontend dependencies install from the committed lockfile and the production TypeScript/Vite build succeeds.
