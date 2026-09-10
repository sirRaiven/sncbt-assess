import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function readRequired(path) {
  const absolute = join(root, path);
  assert.ok(existsSync(absolute), `Missing required file: ${path}`);
  return readFileSync(absolute, "utf8");
}

test("maintenance mode is production-safe and runtime-configurable", () => {
  const nuxtConfig = readRequired("nuxt.config.ts");
  const envExample = readRequired(".env.example");

  assert.match(
    nuxtConfig,
    /maintenanceMode:\s*true/,
    "Temporary maintenance release must default maintenanceMode to true",
  );
  assert.match(
    envExample,
    /NUXT_PUBLIC_MAINTENANCE_MODE=false/,
    "Local environment example must show how to disable maintenance mode",
  );
});

test("global authorization middleware gates the app before Supabase auth work", () => {
  const middleware = readRequired("app/middleware/authorization.global.ts");

  const configIndex = middleware.indexOf("useRuntimeConfig");
  const maintenanceIndex = middleware.indexOf("isMaintenanceModeEnabled");
  const userIndex = middleware.indexOf("useSupabaseUser");

  assert.ok(configIndex >= 0, "Middleware must read Nuxt runtime config");
  assert.ok(maintenanceIndex >= 0, "Middleware must evaluate maintenance mode");
  assert.ok(userIndex >= 0, "Middleware must still contain normal Supabase auth handling");
  assert.ok(
    maintenanceIndex < userIndex,
    "Maintenance redirect must happen before Supabase user/profile access",
  );

  assert.match(middleware, /to\.path\s*!==\s*["']\/maintenance["']/);
  assert.match(middleware, /navigateTo\(\s*["']\/maintenance["']/s);
  assert.match(middleware, /to\.path\s*===\s*["']\/maintenance["']/);
  assert.match(middleware, /navigateTo\(\s*["']\/["']/s);
});

test("maintenance page is a standalone, non-indexed status surface", () => {
  const page = readRequired("app/pages/maintenance.vue");

  assert.match(page, /layout:\s*false/);
  assert.match(page, /System Maintenance/i);
  assert.match(page, /Maintenance in progress/i);
  assert.match(page, /noindex/i);
  assert.doesNotMatch(page, /sign\s*in/i);
  assert.doesNotMatch(page, /password/i);
});
