# EZ — Workflow intelligence MVP

EZ helps a small business move from operational friction to a practical tool recommendation, implementation plan, and manually reported adoption outcome. The first assessment engine is transparent and rule-based; it does not call an AI service.

## Run locally (Windows PowerShell)

Requirements: Node.js 22.5+ and npm. SQLite uses Node's built-in `node:sqlite` module, so a native compiler is not required.

```powershell
npm install
Copy-Item .env.example .env
# Set SESSION_SECRET in .env to a long random value before sharing the app or using production mode.
npm start
```

Open http://localhost:3000. SQLite files are created in `data/` and persist across server restarts. If `SESSION_SECRET` is unset in development, EZ creates a random local secret in `data/.session-secret` so sign-ins remain valid when the server restarts. Set a stable secret in `.env` for production. `npm run dev` starts Node's watch mode.

Google sign-in is available when OAuth credentials are configured. Create a Google OAuth 2.0 web client, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`, and register that exact redirect URI with Google. Without credentials, the button explains setup is needed and email sign-in and demo access remain available.

### GitHub sign-in and project import

GitHub sign-in uses a GitHub OAuth App with the `read:user` and `user:email` scopes. To import a project, create a GitHub App with **Contents: read-only** and **Metadata: read-only**, set its **Setup URL** to `http://localhost:3000/api/github/callback`, and let users install it on selected repositories only. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_PRIVATE_KEY` in `.env`. Set the OAuth callback URL to the exact value of `GITHUB_REDIRECT_URI`; both callback URLs must use the same host and port as EZ. For a different local port or deployment, update both GitHub URLs and `.env` accordingly. Store the App private key securely; `GITHUB_PRIVATE_KEY` accepts a PEM key with `\n` in place of line breaks.

After installation, users choose one of the repositories the GitHub App can access. EZ reads the repository name, description or a short README excerpt, and language breakdown to prefill the SaaS profile. Users still describe one task they want to make easier, because a code repository cannot reliably reveal their business pain points. EZ does not clone the repository or save a GitHub access token. The selected repository and installation ID are stored in SQLite so the user can import its details again. Disconnect the GitHub App in GitHub to revoke its repository access.

## Demo

Choose **Explore the demo** on the landing page. EZ creates a separate illustrative Northstar Creative Studio workspace with workflows, findings, recommendations, an implementation plan, tasks, and a clearly labelled sample adoption report. The demo does not require a shared password and is separate from registered accounts. Demo changes persist in the local database.

## Included workflow

- Register, sign in, and sign out with bcrypt password hashing and server-side SQLite sessions.
- Optional Google sign-in with OAuth state verification and verified Google profile email.
- Three-step business onboarding for business details, current tools, priorities, and recurring workflows.
- Rule-based workflow findings with impact, improvement, priority, and indicative confidence.
- Curated tool catalogue and recommendations linked to assessment findings. Pricing text directs users to verify current details on official sites.
- Recommendation selection, implementation plans, editable task status, owner, due date, and notes.
- Manually reported team adoption, blockers, improvement, and estimated time saved.
- Database-backed dashboard metrics and business settings.
- Business ownership checks on every business-specific endpoint.

## Security notes

- Passwords are hashed with bcrypt; raw passwords are never returned.
- SQLite uses prepared statements, foreign keys, and cascading ownership relationships.
- Authenticated writes use a session-bound CSRF token; cookies are HTTP-only and SameSite=Lax.
- Helmet security headers and rate limiting protect the app and authentication endpoints.
- Production requires `SESSION_SECRET` and enables secure cookies. Put the app behind HTTPS in production.
- This MVP has a single owner per business and does not include team accounts, password reset, email verification, or external identity providers.

## Known limits

- Assessment uses simple keyword rules and user-entered workflow descriptions. Confidence is a heuristic signal, not a statistical guarantee.
- Google sign-in requires a client ID and secret created in the operator's Google Cloud project.
- The catalogue is intentionally small; exact numeric pricing is not quoted as verified and should be checked with each vendor.
- Adoption and time saved are user-reported and are not measured automatically.
- The demo workspace is shared on the local installation and its changes persist. Avoid entering sensitive customer information in demo mode.
- This MVP is for local evaluation; production use needs operational hardening, HTTPS, backups, and a managed secret.
