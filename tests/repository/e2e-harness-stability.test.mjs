import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("Nuxt E2E setup has explicit cold-start and teardown budgets", async () => {
  const setup = await source("tests/e2e/helpers/setup.ts");

  assert.match(
    setup,
    /setupTimeout:\s*300_000/,
    "E2E setup must allow slow Windows/Nuxt cold starts up to five minutes",
  );
  assert.match(
    setup,
    /teardownTimeout:\s*60_000/,
    "E2E teardown must have an explicit one-minute cleanup budget",
  );
});
