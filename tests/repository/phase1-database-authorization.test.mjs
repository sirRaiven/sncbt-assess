import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase/migrations/20260910040000_phase1_database_authorization_hardening.sql",
);

function readRequired(path) {
  assert.ok(existsSync(path), `Missing required file: ${path}`);
  return readFileSync(path, "utf8");
}

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(absolute));
    } else if (/\.(?:ts|js|mjs|vue)$/.test(entry)) {
      files.push(absolute);
    }
  }
  return files;
}

test("Nuxt/browser code does not call privileged PostgreSQL RPCs directly", () => {
  const directories = [join(root, "app"), join(root, "server")];
  const offenders = [];

  for (const directory of directories) {
    for (const file of collectSourceFiles(directory)) {
      const source = readFileSync(file, "utf8");
      if (/\.rpc\s*\(/.test(source)) {
        offenders.push(file.replace(`${root}/`, ""));
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Direct browser/server RPC calls must be routed through authenticated Edge Functions: ${offenders.join(", ")}`,
  );
});



test("all Supabase Edge Function RPC calls stay on the privileged server client", () => {
  const edgeRoot = join(root, "supabase/functions");
  const offenders = [];

  for (const file of collectSourceFiles(edgeRoot)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\.rpc\s*\(/g)) {
      const prefix = source.slice(Math.max(0, match.index - 180), match.index);
      if (!/(?:supabaseAdmin|\badmin)\s*$/.test(prefix)) {
        offenders.push(`${file.replace(`${root}/`, "")}:${source.slice(0, match.index).split("\n").length}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Edge Function RPC calls must use a service-role/admin client: ${offenders.join(", ")}`,
  );
});

test("Phase 1 includes a live read-only verification script and deployment guide", () => {
  const verification = readRequired(
    join(root, "supabase/verification/20260910_phase1_verify_database_authorization.sql"),
  );
  const guide = readRequired(
    join(root, "docs/remediation/PHASE_1_DATABASE_AUTHORIZATION.md"),
  );

  for (const expected of [
    "anon_executable_functions",
    "unexpected_authenticated_executable_functions",
    "service_role_missing_execute",
    "unsafe_security_definer_search_paths",
  ]) {
    assert.ok(verification.includes(expected), `Verification SQL should report ${expected}`);
  }

  assert.match(guide, /39 current PostgreSQL RPC names/i);
  assert.match(guide, /No Supabase Edge Function needs redeployment/i);
  assert.match(guide, /db push --linked --dry-run/i);
});

test("Phase 1 classifies the complete database-function snapshot", () => {
  const classification = JSON.parse(
    readRequired(join(root, "supabase/security/20260910_phase1_rpc_classification.json")),
  );

  assert.equal(classification.definition_count, 65);
  assert.equal(classification.unique_function_name_count, 62);
  assert.deepEqual(
    [...classification.policy_helper_exceptions].sort(),
    ["current_account_status", "current_user_role"].sort(),
  );

  const activeEdgeRpcNames = new Set(
    classification.functions
      .filter((entry) => entry.referenced_by_edge_function_source)
      .map((entry) => entry.name),
  );
  assert.equal(activeEdgeRpcNames.size, 39);
});

test("Phase 1 migration denies public browser execution and preserves service-role RPC access", () => {
  const sql = readRequired(migrationPath);

  assert.match(
    sql,
    /revoke\s+execute\s+on\s+all\s+functions\s+in\s+schema\s+public\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+all\s+functions\s+in\s+schema\s+public\s+to\s+service_role\s*;/i,
  );

  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.current_user_role\s*\(\s*\)\s+to\s+authenticated\s*;/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.current_account_status\s*\(\s*\)\s+to\s+authenticated\s*;/i,
  );

  const authenticatedGrants = [
    ...sql.matchAll(
      /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\([^;]*?\)\s+to\s+authenticated\s*;/gi,
    ),
  ].map((match) => match[1]);

  assert.deepEqual(
    authenticatedGrants.sort(),
    ["current_account_status", "current_user_role"].sort(),
    "Only the two caller-scoped RLS helpers may be executable by authenticated browser users",
  );

  assert.doesNotMatch(
    sql,
    /grant\s+execute\b[^;]*\bto\s+anon\b/i,
    "Phase 1 must not grant anonymous users execution on application RPCs",
  );
});

test("Phase 1 migration secures default privileges for future public functions", () => {
  const sql = readRequired(migrationPath);

  assert.match(
    sql,
    /alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public\s+revoke\s+execute\s+on\s+functions\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
  );
  assert.match(
    sql,
    /alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public\s+grant\s+execute\s+on\s+functions\s+to\s+service_role\s*;/i,
  );
});

test("Phase 1 migration hardens every public SECURITY DEFINER search_path without rewriting function bodies", () => {
  const sql = readRequired(migrationPath);

  assert.match(sql, /p\.prosecdef\s*=\s*true/i);
  assert.match(sql, /n\.nspname\s*=\s*'public'/i);
  assert.match(
    sql,
    /alter\s+function\s+%s\s+set\s+search_path\s+to\s+%L/i,
  );
  assert.doesNotMatch(
    sql,
    /create\s+or\s+replace\s+function/i,
    "Authorization hardening should not replace assessment function bodies",
  );
});
