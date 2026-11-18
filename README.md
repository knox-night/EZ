# EZ

EZ is an early-access, frontend-only prototype for a product-testing network. It uses plain HTML, CSS, and JavaScript and has no build step or installed dependencies.

## Run locally

Serve this folder over HTTP, for example with `python -m http.server 8000`, then open `http://localhost:8000/`. OAuth redirects require the local URL to be allowed in the Supabase project's authentication settings.

## What currently works

- Google and GitHub sign-in through the existing Supabase Auth project, when its providers and redirect URLs are configured.
- Landing, dashboard, mission filters, sorting, mission detail dialogs, and responsive navigation.
- Signed-in users can create and delete temporary mission previews. These exist only in the current page session; they are not published or persisted.
- Required fields and HTTPS product/form URLs are validated before a preview is created.

## Not connected yet

- The six mission briefs are examples, not live opportunities. Listed spots and demo reward amounts are illustrative.
- Mission applications, tester matching/recruitment, feedback submission storage, founder review, and mission publishing are not connected.
- Demo credit amounts are not account balances. No client action awards, spends, or redeems credits.
- Authentication does not itself persist mission data or isolate application data. The browser does not call the database schema described below.

## Supabase setup

`app.js` contains the existing Supabase project URL and publishable/anon key. That key is intended for browser use; never put a service-role key in this repository. Configure GitHub and Google as Supabase Auth providers and allow the deployed GitHub Pages URL and local development URL in the provider and redirect settings.

The current frontend uses Supabase Auth only. It does not read or write the database. A public anon key is not a security boundary: database access must be protected by row-level security.

## Database schema preparation

The initial schema is in [`supabase/migrations/20261118_000001_ez_mvp_schema.sql`](./supabase/migrations/20261118_000001_ez_mvp_schema.sql). Review it, then apply it to the intended Supabase project using the Supabase SQL Editor or the Supabase CLI migration workflow. It defines profiles, missions, applications, founder invitations, submissions, and a protected credit ledger with a 12-month earning expiry rule and row-level security policies.

This migration has not been applied or tested against the live project. It is schema preparation, not a connected backend. Before enabling live missions, implement and test trusted server-side operations for application acceptance with atomic spot limits, invitation/recruitment workflows, founder review, idempotent credit awards, mission spending, and expiration processing. Authenticated browser clients must not receive ledger write access. Never use a service-role key in the frontend.

The tester profile and mission audience fields are foundations for future matching and active recruitment; no matching algorithm or recruitment workflow exists yet.