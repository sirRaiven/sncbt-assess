import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

test("all Supabase migrations use unique 14-digit timestamp versions", () => {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const versions = files.map((name) => {
    const match = name.match(/^(\d{14})_.+\.sql$/);
    assert.ok(match, `Migration must use YYYYMMDDHHmmss_name.sql: ${name}`);
    return match[1];
  });

  assert.equal(new Set(versions).size, versions.length, "Migration versions must be unique");
});

test("migration-history repair guide protects against replaying legacy SQL", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const guidePath = join(root, "docs/remediation/PHASE_1_MIGRATION_HISTORY_REPAIR.md");
  const verifyPath = join(root, "supabase/verification/20260910_verify_legacy_migrations_before_history_repair.sql");
  assert.ok(existsSync(guidePath), "Missing migration history repair guide");
  assert.ok(existsSync(verifyPath), "Missing legacy migration read-only precheck");
  const guide = readFileSync(guidePath, "utf8");
  assert.match(guide, /migration repair 20260901010000 20260901011000 20260901012000 20260908000000 --status applied --linked/);
  assert.match(guide, /dry run must list only/i);
});

test("legacy migration precheck uses PostgreSQL standard-conforming regex escapes", async () => {
  const { readFileSync } = await import("node:fs");
  const verifyPath = join(root, "supabase/verification/20260910_verify_legacy_migrations_before_history_repair.sql");
  const sql = readFileSync(verifyPath, "utf8");
  assert.ok(sql.includes("[[:space:]]*\\.[[:space:]]*"));
  assert.ok(!sql.includes("[[:space:]]*\\\\.[[:space:]]*"));
});
