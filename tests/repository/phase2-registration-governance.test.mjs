import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const migrationPath = "supabase/migrations/20260910100000_phase2_self_registration_identity_hardening.sql";
const edgePath = "supabase/functions/auth-register-check/index.ts";
const registerPagePath = "app/pages/register.vue";
const registrationComposablePath = "app/composables/useRegistrationCheck.ts";
const registrationTypePath = "app/types/auth-registration.ts";
const createClassPath = "app/pages/instructor/classes/create.vue";
const classroomsFunctionPath = "supabase/functions/classrooms/index.ts";
const classroomTypePath = "app/types/classroom.ts";

const verificationPath = "supabase/verification/20260910_phase2_verify_registration_governance.sql";

function source(path) {
  assert.ok(existsSync(path), `${path} must exist`);
  return readFileSync(path, "utf8");
}

test("Phase 2 migration makes student and instructor self-registration active and locks duplicate check to service_role", () => {
  const sql = source(migrationPath);

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.registration_identity_conflict\s*\(/i);
  assert.match(sql, /from\s+auth\.users/i);
  assert.match(sql, /from\s+public\.accounts/i);
  assert.match(sql, /from\s+public\.student_profiles/i);
  assert.match(sql, /from\s+public\.instructor_profiles/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.registration_identity_conflict[\s\S]*from\s+public/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.registration_identity_conflict[\s\S]*from\s+anon/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.registration_identity_conflict[\s\S]*from\s+authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.registration_identity_conflict[\s\S]*to\s+service_role/i);

  assert.match(sql, /requested_role_value\s*:=\s*'instructor'/i);
  assert.match(sql, /approved_role_value\s*:=\s*'instructor'/i);
  assert.match(sql, /status_value\s*:=\s*'active'/i);
  assert.doesNotMatch(sql, /Pending instructors have not received/i);

  assert.match(sql, /update\s+public\.accounts[\s\S]*role\s*=\s*'instructor'[\s\S]*account_status\s*=\s*'active'[\s\S]*account_status\s*=\s*'pending'/i);
  assert.match(sql, /alter\s+table\s+public\.classrooms[\s\S]*join_requires_approval[\s\S]*set\s+default\s+true/i);
});

test("public registration check validates identity without receiving passwords or exposing which field matched", () => {
  const edge = source(edgePath);

  assert.match(edge, /isBrowserOriginAllowed/);
  assert.match(edge, /optionsResponse/);
  assert.match(edge, /req\.method\s*!==\s*"POST"/);
  assert.match(edge, /accountType/);
  assert.match(edge, /accountNumber/);
  assert.match(edge, /email/);
  assert.doesNotMatch(edge, /password\??\s*:/i);
  assert.match(edge, /\.rpc\(\s*"registration_identity_conflict"/);
  assert.match(edge, /ACCOUNT_EXISTS/);
  assert.match(edge, /An account already exists for the provided registration information\. Please sign in or use password recovery\./);
  assert.doesNotMatch(edge, /email already exists|student number already exists|employee number already exists/i);
});

test("registration UI checks identity before Supabase signUp and no longer promises admin approval", () => {
  const page = source(registerPagePath);
  const composable = source(registrationComposablePath);
  const types = source(registrationTypePath);
  const pendingPage = source("app/pages/account-pending.vue");
  const adminUsersPage = source("app/pages/admin/users/index.vue");

  assert.match(composable, /"auth-register-check"/);
  assert.match(composable, /checkRegistrationIdentity/);
  assert.match(types, /RegistrationAccountType/);

  const checkIndex = page.indexOf("checkRegistrationIdentity(");
  const signupIndex = page.indexOf("supabase.auth.signUp(");
  assert.ok(checkIndex >= 0, "register page must call checkRegistrationIdentity");
  assert.ok(signupIndex >= 0, "register page must still use Supabase signUp");
  assert.ok(checkIndex < signupIndex, "identity check must happen before auth.signUp");

  assert.doesNotMatch(page, /administrator approval/i);
  assert.match(page, /Duplicate account protection/i);
  assert.match(page, /getAccountDestination\(profile\)/);
  assert.match(page, /ACCOUNT_EXISTS/);
  assert.doesNotMatch(pendingPage, /administrator.*approve|pending approval/i);
  assert.doesNotMatch(adminUsersPage, /approve instructors|review registrations/i);
});

test("new classes require enrollment approval by default in UI and server creation", () => {
  const page = source(createClassPath);
  const edge = source(classroomsFunctionPath);
  const types = source(classroomTypePath);

  assert.match(page, /requireApproval:\s*true/);
  assert.match(page, /requireApproval:\s*event\.data\.requireApproval/);
  assert.doesNotMatch(page, /setEnrollmentApprovalRequired\(\s*result\.data\.classroom\.id/);

  assert.match(edge, /requireApproval:\s*z\s*\.boolean\(\)\s*\.default\(true\)/);
  assert.match(edge, /join_requires_approval:\s*payload\.joinEnabled\s*\?\s*payload\.requireApproval\s*:\s*false/);
  assert.match(types, /requireApproval\?:\s*boolean/);
});


test("Phase 2 live verification checks PUBLIC execute through ACLs instead of treating PUBLIC as a role", () => {
  const sql = source(verificationPath);

  assert.match(sql, /aclexplode\s*\(/i);
  assert.match(sql, /grantee\s*=\s*0/i);
  assert.match(sql, /privilege_type\s*=\s*'EXECUTE'/i);
  assert.doesNotMatch(sql, /has_function_privilege\(\s*'public'/i);
});

test("class creation uses one atomic approval request with no stale follow-up block", () => {
  const page = source("app/pages/instructor/classes/create.vue");

  assert.match(page, /requireApproval:\s*event\.data\.requireApproval/);
  assert.doesNotMatch(
    page,
    /approval setting couldn't be saved/i,
    "Atomic class creation must not retain the obsolete post-create approval fallback",
  );
});

test("Nuxt runtime tests prepare generated project references before Vitest", () => {
  const packageJson = JSON.parse(source("package.json"));

  assert.match(
    packageJson.scripts.test,
    /^nuxt prepare && vitest run --project unit --project nuxt$/,
  );
  assert.match(
    packageJson.scripts["test:nuxt"],
    /^nuxt prepare && vitest run --project nuxt$/,
  );
});
