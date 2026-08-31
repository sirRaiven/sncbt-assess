import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const exists = (path) => existsSync(join(root, path));

const criticalPaths = [
  "app/pages/index.vue",
  "app/pages/student/dashboard.vue",
  "app/pages/student/assessments/index.vue",
  "app/pages/student/assessments/[id]/play.vue",
  "app/pages/instructor/dashboard.vue",
  "app/pages/instructor/classes/index.vue",
  "app/pages/instructor/assessments/index.vue",
  "app/pages/instructor/results/index.vue",
  "app/pages/admin/dashboard.vue",
  "app/composables/useAssessmentDelivery.ts",
  "app/composables/useAssessments.ts",
  "app/composables/useClassrooms.ts",
  "supabase/functions/assessment-delivery/index.ts",
  "supabase/functions/assessments/index.ts",
  "supabase/functions/classrooms/index.ts",
  "supabase/functions/questions/index.ts",
  "vitest.config.ts",
];

test("critical SNCBT Assess application surfaces are present", () => {
  const missing = criticalPaths.filter((path) => !exists(path));
  assert.deepEqual(missing, [], `Missing critical files: ${missing.join(", ")}`);
});

test("every Supabase Edge Function directory contains an index.ts entry point", () => {
  const functionsRoot = join(root, "supabase/functions");
  const missing = readdirSync(functionsRoot)
    .filter((name) => name !== "_shared")
    .filter((name) => statSync(join(functionsRoot, name)).isDirectory())
    .filter((name) => !existsSync(join(functionsRoot, name, "index.ts")));

  assert.deepEqual(missing, [], `Functions without index.ts: ${missing.join(", ")}`);
});

test("local secrets and generated test artifacts are ignored", () => {
  const ignore = readFileSync(join(root, ".gitignore"), "utf8");
  for (const pattern of [".env", "!.env.test.example", "supabase/.temp/", "playwright-report/", "test-results/"]) {
    assert.ok(ignore.includes(pattern), `.gitignore should contain ${pattern}`);
  }
});

test("Vitest and Nuxt Test Utils are the active test stack", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  for (const script of ["test", "test:unit", "test:nuxt", "test:e2e", "check", "verify"]) {
    assert.ok(pkg.scripts?.[script], `Missing npm script: ${script}`);
  }

  for (const dependency of ["@nuxt/test-utils", "vitest", "@vue/test-utils", "happy-dom", "playwright-core"]) {
    assert.ok(pkg.devDependencies?.[dependency], `Missing test devDependency: ${dependency}`);
  }

  assert.equal(pkg.devDependencies?.["@playwright/test"], undefined, "@playwright/test should not be installed");
  assert.equal(pkg.devDependencies?.playwright, undefined, "playwright should not be installed as a standalone package");
});
