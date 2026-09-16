# Google sign-in

ORCA uses Google Identity Services in the login page and verifies the returned ID token on the backend. Password sign-in remains available.

## Configuration

- Vercel frontend: `VITE_GOOGLE_CLIENT_ID` (public Web OAuth client ID).
- Render backend: `GOOGLE_CLIENT_ID`, set to the same ID.
- Google Cloud OAuth client: authorize `https://team-orbit-x-sih-26.vercel.app` as a JavaScript origin. Add only the development origins you actually use. Preview domains need separate authorized origins if Google sign-in is tested there.
- Run `python -m alembic upgrade head` before starting the backend; revision `0006_google_identity` adds a nullable unique Google subject binding. The Render build command already runs migrations.

No Google client secret is required by this ID-token flow. Never place a client secret in a `VITE_` variable.

## Account handling

Signature, expiry, issuer and audience are verified by google-auth. A verified email and stable Google subject are required. Existing subject bindings preserve the ORCA account even if the Google email changes. New identities create ordinary USER accounts. Existing Gmail or verified Workspace email accounts may bind to the same ORCA account; other existing email accounts require password sign-in because Google is not authoritative for ownership of those external mailboxes. An authenticated external-email linking UI is not implemented.

Disabled accounts are rejected. Roles come from the database. Conflicting bindings are rejected. Database failures do not create memory-only accounts or successful sessions. Google certificate/network failures produce a retryable unavailable message. Google tokens are exchanged for ordinary ORCA sessions and are not stored by the frontend.

The Google script loads only on the login route. It has a bounded loading state, error feedback and suppression of repeated sign-in callbacks while a request is pending.

## Verification boundary

Automated tests use controlled Google claim responses to exercise account handling and rejection paths. These tests do not constitute a real Google account sign-in. A real account chooser/consent completion must also be checked in the deployed browser.
