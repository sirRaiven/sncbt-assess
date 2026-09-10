import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

function source(path) {
  assert.ok(existsSync(path), `${path} must exist`);
  return readFileSync(path, "utf8");
}

test("temporary profile failures retain the authenticated session and use a retry surface", () => {
  const profile = source("app/composables/useCurrentProfile.ts");
  const profileTypes = source("app/types/profile.ts");
  const middleware = source("app/middleware/authorization.global.ts");
  const login = source("app/pages/index.vue");
  const errorPage = source("app/pages/account-access-error.vue");

  assert.match(profileTypes, /export type ProfileLoadIssue/);
  assert.match(profileTypes, /"temporary-error"/);
  assert.match(profile, /profileLoadIssue/);
  assert.match(middleware, /profileLoadIssue\.value\s*===\s*"temporary-error"/);
  assert.match(middleware, /\/account-access-error/);
  assert.match(middleware, /profileIndependentPaths/);
  assert.match(middleware, /"\/confirm"/);
  assert.match(middleware, /"\/reset-password"/);
  assert.match(login, /profileLoadIssue/);
  assert.match(errorPage, /Try again/i);

  const transientBranch = middleware.match(/if\s*\(\s*profileLoadIssue\.value\s*===\s*"temporary-error"[\s\S]{0,700}?\n\s*\}/)?.[0] ?? "";
  assert.doesNotMatch(transientBranch, /auth\.signOut/);
});

test("legacy auth middleware never redirects to the nonexistent login route", () => {
  for (const path of [
    "app/middleware/auth.ts",
    "app/middleware/admin.ts",
    "app/middleware/instructor.ts",
    "app/middleware/student.ts",
  ]) {
    assert.doesNotMatch(source(path), /navigateTo\(\s*["']\/login["']/);
  }
});

test("Instructor assessment navigation uses scheduling instead of obsolete Start Live routes", () => {
  const list = source("app/pages/instructor/assessments/index.vue");
  const preview = source("app/pages/instructor/assessments/[id]/preview.vue");
  const legacyCreate = source("app/pages/instructor/sessions/create.vue");

  assert.doesNotMatch(list, /Start Live/);
  assert.doesNotMatch(preview, /Start Live/);
  assert.doesNotMatch(list, /\/instructor\/sessions\/create\?assessmentId=/);
  assert.match(preview, /Schedule Classes/);
  assert.match(legacyCreate, /\/instructor\/assessments\/\$\{assessmentId\}\/assign/);
  assert.match(legacyCreate, /\/instructor\/sessions/);
});

test("Instructor class-code copy reports success only after clipboard write succeeds", () => {
  const classes = source("app/pages/instructor/classes/index.vue");

  assert.match(classes, /async function copyCode/);
  assert.match(classes, /await navigator\.clipboard\.writeText\(code\)/);
  assert.match(classes, /Unable to copy class code/);
  assert.doesNotMatch(classes, /void navigator\.clipboard[\s\S]{0,120}Class code copied/);
});

test("Instructor scheduling uses explicit Philippine-time conversion instead of device-local datetime parsing", () => {
  const utility = source("app/utils/philippine-time.ts");
  const assign = source("app/pages/instructor/assessments/[id]/assign.vue");
  const modal = source("app/components/AssessmentScheduleActionModal.vue");
  const dashboard = source("app/pages/instructor/dashboard.vue");
  const sessions = source("app/pages/instructor/sessions/index.vue");
  const monitor = source("app/pages/instructor/sessions/[id]/monitor.vue");

  assert.match(utility, /Asia\/Manila/);
  assert.match(utility, /philippineLocalInputToIso/);
  assert.match(utility, /toPhilippineLocalInput/);
  assert.match(assign, /philippineLocalInputToIso/);
  assert.match(assign, /toPhilippineLocalInput/);
  assert.doesNotMatch(assign, /new Date\(\s*row\.startsAtLocal\s*\)\.toISOString\(\)/);
  assert.doesNotMatch(assign, /new Date\(\s*row\.endsAtLocal\s*\)\.toISOString\(\)/);
  assert.match(modal, /philippineLocalInputToIso/);
  assert.doesNotMatch(modal, /new Date\(startsAtLocal\.value\)\.toISOString\(\)/);
  assert.doesNotMatch(modal, /new Date\(endsAtLocal\.value\)\.toISOString\(\)/);
  assert.match(dashboard, /formatPhilippineDateTime/);
  assert.match(sessions, /PHILIPPINE_TIME_ZONE|Asia\/Manila|formatPhilippine/);
  assert.match(monitor, /formatPhilippineDateTime|PHILIPPINE_TIME_ZONE|Asia\/Manila/);

  const studentAccess = source("app/components/AssessmentStudentAccessModal.vue");
  const results = source("app/pages/instructor/results/index.vue");
  assert.match(studentAccess, /philippineLocalInputToIso/);
  assert.match(studentAccess, /toPhilippineLocalInput/);
  assert.doesNotMatch(studentAccess, /new Date\(startsAtLocal\.value\)/);
  assert.doesNotMatch(studentAccess, /new Date\(endsAtLocal\.value\)/);
  assert.match(results, /philippineDateInput/);
  assert.doesNotMatch(results, /getFullYear\(|getMonth\(|getDate\(/);
  const resetFilters = results.match(/function\s+resetFilters\(\):\s*void\s*\{[\s\S]{0,500}?\n\}/)?.[0] ?? "";
  assert.match(resetFilters, /philippineDateInput/);
  assert.doesNotMatch(resetFilters, /localDateInput|monthStart\b|\btoday\b/);

  for (const path of [
    "app/pages/instructor/archive.vue",
    "app/pages/instructor/classes/[id]/students.vue",
    "app/pages/instructor/assessments/[id]/import-preview.vue",
  ]) {
    const page = source(path);
    assert.doesNotMatch(page, /\.toLocaleString\(/);
    assert.match(page, /formatPhilippineDateTime|PHILIPPINE_TIME_ZONE|Asia\/Manila/);
  }
});

test("Instructor Excel import client exposes only actions implemented by the current assessment-import Edge Function", () => {
  const client = source("app/composables/useAssessmentImport.ts");
  const server = source("supabase/functions/assessment-import/index.ts");

  assert.doesNotMatch(client, /importQuestions/);
  assert.doesNotMatch(client, /["']import-questions["']/);
  for (const action of ["get-import", "commit-import", "cancel-import"]) {
    assert.match(client, new RegExp(`["']${action}["']`));
    assert.match(server, new RegExp(`z\\.literal\\(\\s*["']${action}["']`));
  }
});
