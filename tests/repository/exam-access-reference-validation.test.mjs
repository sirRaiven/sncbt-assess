import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const instructionsPath = new URL(
  "../../app/pages/student/assessments/[id]/instructions.vue",
  import.meta.url,
);

const deliveryFunctionPath = new URL(
  "../../supabase/functions/assessment-delivery/index.ts",
  import.meta.url,
);

test("exam access reference input is numeric-only and keeps leading zeros", async () => {
  const source = await readFile(instructionsPath, "utf8");

  assert.match(source, /inputmode="numeric"/);
  assert.match(source, /pattern="\[0-9\]\*"/);
  assert.match(source, /updateAccessReferenceNumber/);
  assert.match(source, /replace\(\/\\D\+\/g,\s*""\)/);
  assert.match(source, /maxlength="12"/);
});

test("assessment-delivery rejects non-numeric exam access references", async () => {
  const source = await readFile(deliveryFunctionPath, "utf8");

  assert.match(source, /EXAM_ACCESS_REFERENCE_PATTERN\s*=\s*\/\^\\d\{1,12\}\$\//);
  assert.match(source, /EXAM_ACCESS_REFERENCE_INVALID/);
  assert.match(source, /numbers only/);
});
