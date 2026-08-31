# SNCBT Assess test suite

SNCBT Assess uses the exact Nuxt-supported stack already present in this project:

- `vitest` for unit, Nuxt-runtime, and test orchestration
- `@nuxt/test-utils` for Nuxt runtime and real-browser E2E
- `@vue/test-utils` for Vue component mounting
- `happy-dom` for fast Nuxt DOM tests
- `playwright-core` for Chromium, Firefox, WebKit, browser fetch/CORS testing, and APIRequestContext integration tests

`@playwright/test` is intentionally not required because Nuxt Test Utils is the browser runner.

## Install

The dependencies are already declared in `package.json`:

```bash
npm install
```

Install the three Playwright browser engines once:

```bash
npm run test:browsers:install
```

Equivalent command:

```bash
npx playwright-core install chromium firefox webkit
```

## Fast source checks

```bash
npm run test
```

Runs unit + Nuxt-runtime tests only. It intentionally does not launch real browsers, so it stays fast during development.

```bash
npm run check
```

Runs unit/Nuxt tests, repository checks, orphan-code audit, ESLint, and Nuxt type checking.

```bash
npm run verify
```

Runs `check` and a production Nuxt build.

## Unit tests

```bash
npm run test:unit
npm run test:unit:coverage
```

Use these for pure rules, parsers, navigation helpers, and other code that does not need a Nuxt runtime.

## Nuxt runtime / component tests

```bash
npm run test:nuxt
```

Runs inside the Nuxt test environment with `happy-dom`. The assessment-delivery composable contract is tested here so draft saves and Check Answer finalization cannot silently regress.

## API tests without a browser

```bash
npm run test:api
```

Uses Playwright `APIRequestContext` from `playwright-core` to test the deployed Supabase health endpoint and smoke every authenticated Edge Function for missing deployments or 5xx failures. These tests are browser-independent and therefore run once for efficiency.

## Core cross-browser compatibility

```bash
npm run test:e2e
```

Runs the same Nuxt E2E suites sequentially in:

1. Chromium
2. Firefox
3. WebKit

This is the important engine-level compatibility matrix. WebKit is the closest local engine coverage for Safari, but it is not a substitute for testing the real Safari application on macOS/iOS.

Individual engines:

```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

## Branded Chrome and Edge

On machines where Google Chrome and Microsoft Edge are installed:

```bash
npm run test:e2e:chrome
npm run test:e2e:edge
```

Run core engines plus both branded Chromium browsers:

```bash
npm run test:e2e:full
```

## API compatibility from real browsers

```bash
npm run test:api:browser
```

Runs browser-side `fetch()` against Supabase in Chromium, Firefox, and WebKit. Unlike server-side API tests, this catches browser CORS, fetch, TLS/network, and JSON compatibility problems.

The authenticated API smoke deliberately sends a non-user request and only checks that the browser can reach the deployed function without CORS, 404, or 5xx failures. Destructive API actions are not performed.

## Browser performance smoke

```bash
npm run test:performance
```

Runs a broad sign-in page load budget in Chromium, Firefox, and WebKit and prints timing/resource metrics. Defaults can be adjusted in `.env.test`:

```env
E2E_MAX_API_MS=8000
E2E_MAX_PAGE_LOAD_MS=15000
```

Use conservative values locally. For meaningful performance regression gates, point `E2E_BASE_URL` at a stable staging deployment and tighten the budgets after collecting a baseline.

## Authenticated role tests

Create `.env.test` from `.env.test.example` and use dedicated testing accounts. Student, instructor, and administrator suites run automatically when their credentials are present instead of being silently unavailable because `.env.test` was loaded too late.

## Orphan/dead source audit

```bash
npm run audit:orphans
```

The audit fails on obvious stale source artifacts such as `.tmp`, `.bak`, `.old`, and misplaced Vue components under `app/composables`. It also reports potential unused Nuxt components and composables for manual review.

```bash
npm run audit:orphans:strict
```

Strict mode also fails when candidate unused components/composables exist. Review candidates before deleting them because Nuxt auto-imports and dynamic usage can make static heuristics imperfect.

Two verified orphan artifacts were removed when this test layer was added:

- `app/types_assessment-delivery.tmp`
- `app/composables/shared/LogoutButton.vue`

## Full verification

```bash
npm run verify:full
```

Runs source verification, deployed API integration, and Chromium/Firefox/WebKit E2E.

For the widest local browser pass:

```bash
npm run verify:browsers
```

That additionally runs installed Google Chrome and Microsoft Edge channels.

## Safety

- Never commit `.env.test` or real account passwords.
- Use dedicated test accounts.
- Keep destructive E2E tests on an isolated Supabase test project.
- Browser API smoke tests in this suite are non-destructive.
- Keep `coverage/`, browser artifacts, `.env*`, and `supabase/.temp/` out of release archives.
