# SNCBT Assessment Management System (SNCBT-AMS)

SNCBT-AMS is the assessment and classroom management application for St. Nicolas College of Business and Technology. The current application uses Nuxt 4/Nuxt UI on the frontend and Supabase PostgreSQL + Edge Functions for backend workflows. The production frontend is deployed to Cloudflare Workers.

## Runtime baseline

Use **Node.js 22.23.2** for local development and builds. The repository includes `.nvmrc`; `package.json` accepts Node `>=22.19.0 <23` because the currently locked Nuxt version requires Node 22.19.0 or newer in the Node 22 line.

On Windows, verify your active runtime before installing dependencies:

```powershell
node --version
npm --version
```

If you use a Node version manager, switch to the version in `.nvmrc`. Cloudflare Workers Builds currently provides Node 22.23.2 in its build image, so this pin can be used consistently locally and in Cloudflare.

## Local setup

Copy the environment example and fill in the **public** Supabase project values:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

The development server normally runs at `http://localhost:3000`.

Required public variables:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY`

Optional/application variables are documented in `.env.example`.

Never put a Supabase service-role key, database password, access token, or other server secret in a `NUXT_PUBLIC_*` variable. Those values are included in the browser bundle by design.

## Local-only files

The following must stay local and must **not** be included in source handoffs or ZIP releases:

- `.env`
- `.env.test`
- `supabase/.temp/`
- `.nuxt/`
- `.output/`
- `node_modules/`
- `coverage/`
- `playwright-report/`
- `test-results/`

The repository contains `.env.example` and `.env.test.example` as safe templates.

## Verification commands

Run the lightweight repository checks first:

```powershell
npm run test:repo
npm run audit:orphans
```

The normal orphan audit fails on confirmed stale source artifacts and Vue components accidentally placed under `app/composables`. It also reports potential unused Nuxt components/composables for manual review.

Strict review mode is intentionally more aggressive and can produce false positives when Nuxt auto-imports or dynamic references are involved:

```powershell
npm run audit:orphans:strict
```

Do not delete a strict-mode candidate until you verify that it is genuinely unused.

For the application verification pipeline:

```powershell
npm run test
npm run lint
npm run typecheck
npm run build
```

Or run the combined gates:

```powershell
npm run check
npm run verify
```

`npm run verify` adds the production Nuxt build after the normal checks.

## Supabase development

The source contains Supabase Edge Functions and recent SQL migrations under `supabase/`. A developer only working on the Nuxt application does **not** need PostgreSQL or `pg_dump` installed.

The current `supabase/sncbt-ams-database-reference.json` is an audit snapshot, not a database backup. The checked-in migration history is also not yet sufficient to recreate the complete production database. See `docs/remediation/PHASE-0-INVENTORY.md` before performing schema/security work.

Do not commit `supabase/.temp/`; `supabase link` recreates local link metadata when needed.

## Deployment safety

Production origin:

`https://sncbt-assess.autox.workers.dev`

Before changing deployment configuration, verify the actual Cloudflare Worker compatibility date/build settings and the deployed Supabase Edge Function JWT settings. The Phase 0 source deliberately does not invent missing `wrangler` or `supabase/config.toml` values.

When deploying through Cloudflare Workers Builds, keep the repository's Node pin or set an equivalent `NODE_VERSION`. Do not move grading, report generation, Excel parsing, or other heavy database workloads into the Cloudflare SSR worker; those operations belong in Supabase/PostgreSQL backend paths.

## Database recovery

Source code, migrations, and the database-reference JSON are not substitutes for a real production database backup. Before destructive database changes, confirm a recoverable Supabase backup/export using the project's available Supabase backup mechanism.

PostgreSQL tooling is not required merely to run the Nuxt frontend or continue normal application development.

## Remediation documentation

The current remediation work is documented under:

- `docs/remediation/PHASE-0-BASELINE-SAFETY-NET.md`
- `docs/remediation/PHASE-0-INVENTORY.md`
- `docs/superpowers/plans/2026-09-10-phase-0-baseline-safety-net.md`

Phase 0 changes repository safety/tooling only. Database privilege hardening starts in Phase 1.

## Temporary maintenance mode

This maintenance release includes a global, reversible web maintenance gate. The source default is intentionally **enabled** for production safety during the SNCBT-AMS remediation window.

For normal local development, add this to your private `.env`:

```dotenv
NUXT_PUBLIC_MAINTENANCE_MODE=false
```

Restart the Nuxt dev server after changing the value. Full deployment, verification, and reopening instructions are in [`docs/MAINTENANCE_MODE.md`](docs/MAINTENANCE_MODE.md).
