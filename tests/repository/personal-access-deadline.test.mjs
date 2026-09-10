import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260908_fix_personal_access_attempt_deadlines.sql";
const verificationPath = "supabase/verification/20260908_verify_personal_access_attempt_deadlines.sql";

function readRequired(path) {
  const absolute = join(root, path);
  assert.ok(existsSync(absolute), `Missing required file: ${path}`);
  return readFileSync(absolute, "utf8");
}

test("personal assessment access has a repository-tracked deadline fix", () => {
  const sql = readRequired(migrationPath);

  for (const expected of [
    "assessment_attempt_has_active_personal_access",
    "enforce_attempt_schedule_deadline",
    "finalize_due_assessment_attempts",
    "prepare_scheduled_attempt_question",
    "save_scheduled_attempt_response",
    "assessment_student_access_grants",
    "consumed_attempt_id",
    "access_grant.ends_at",
    "assignment.ends_at",
    "assignment.closed_at",
  ]) {
    assert.ok(sql.includes(expected), `Migration should contain ${expected}`);
  }

  assert.match(
    sql,
    /attempt\.expires_at\s*<=\s*statement_timestamp\(\)/,
    "Attempt expires_at must remain an unconditional hard deadline",
  );

  assert.match(
    sql,
    /not\s+private\.assessment_attempt_has_active_personal_access\(/,
    "Class closing rules must be bypassed only while the exact personal grant is active",
  );

  assert.ok(
    sql.includes("[[:space:]]*\\.[[:space:]]*ends_at"),
    "PostgreSQL regexp should use a single regex escape for the dot separator",
  );

  assert.ok(
    !sql.includes("[[:space:]]*\\\\.[[:space:]]*ends_at"),
    "PostgreSQL regexp must not double-escape the dot under standard_conforming_strings",
  );

  assert.ok(
    sql.includes("already_grant_aware"),
    "Migration should tolerate previously deployed inline personal-grant guards",
  );

  assert.ok(
    sql.includes("has_assignment_deadline_guard"),
    "Migration should distinguish canonical deadline consumers from harmless compatibility overloads",
  );

  assert.doesNotMatch(
    sql,
    /\bas\s+grant\b|\bgrant\s*\./i,
    "Migration must not use reserved GRANT as an unquoted table alias",
  );
});

test("personal access deadline verification is checked into the repository", () => {
  const sql = readRequired(verificationPath);

  for (const expected of [
    "expires_after_start",
    "within_personal_deadline",
    "grant_link_correct",
    "class_deadline_does_not_override_personal_access",
    "function_guards",
  ]) {
    assert.ok(sql.includes(expected), `Verification SQL should expose ${expected}`);
  }

  assert.doesNotMatch(
    sql,
    /\bas\s+grant\b|\bgrant\s*\./i,
    "Verification SQL must not use reserved GRANT as an unquoted table alias",
  );

  for (const expectedAlias of [
    "as grant_id",
    "as grant_starts_at",
    "as grant_ends_at",
    "as grant_link_correct",
  ]) {
    assert.ok(
      sql.includes(expectedAlias),
      `Verification SQL should preserve ${expectedAlias}`,
    );
  }
});
