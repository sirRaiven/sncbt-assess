# SNCBT Assess test suite

SNCBT Assess uses Vitest as the primary test runner, `@nuxt/test-utils` for Nuxt runtime and E2E helpers, `@vue/test-utils` for Vue component mounting, `happy-dom` for Nuxt DOM tests, and `playwright-core` only for browser automation.

`@playwright/test` is intentionally not used.

## Install

```bash
npm install
npx playwright-core install chromium
```

For Linux CI environments that need browser system dependencies:

```bash
npx playwright-core install --with-deps chromium
```

## Test layers

### Unit

```bash
npm run test:unit
npm run test:unit:coverage
```

Fast tests for pure application rules and utilities.

### Nuxt runtime/component

```bash
npm run test:nuxt
```

Runs inside the Nuxt test environment with `happy-dom`. Use `mountSuspended` for components that depend on Nuxt context, auto-imports, plugins, or routing.

### Repository checks

```bash
npm run test:repo
```

Checks critical files, Edge Function entry points, ignored artifacts, and required npm scripts.

### Backend integration smoke

```bash
npm run test:integration
```

Uses hosted Supabase only when the required environment values are configured.

### Browser E2E

```bash
npm run test:e2e
```

E2E tests are executed by Vitest through `@nuxt/test-utils/e2e`; `playwright-core` launches Chromium.

To show the browser locally:

```bash
E2E_HEADLESS=false npm run test:e2e
```

To target a deployed test environment instead of starting Nuxt locally:

```bash
E2E_BASE_URL=https://your-test-deployment.example npm run test:e2e
```

Authenticated smoke tests use the dedicated values in `.env.test` / `.env.test.example` and skip when credentials are not configured.

## Verification

```bash
npm run check
```

Runs unit tests, Nuxt runtime tests, repository checks, ESLint, and Nuxt type checking.

```bash
npm run verify
```

Runs `check` and the production build.

```bash
npm run verify:full
```

Runs the full verification plus backend integration and browser E2E tests.

## Safety

- Never commit `.env.test` or real account passwords.
- Use dedicated testing accounts.
- Keep destructive E2E tests on an isolated Supabase test project.
- Keep `coverage/`, browser artifacts, `.env*`, and `supabase/.temp/` out of release archives.
