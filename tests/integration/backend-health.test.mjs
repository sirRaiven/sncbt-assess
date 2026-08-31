import test from "node:test";
import assert from "node:assert/strict";

const supabaseUrl = (process.env.NUXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || "";

const canRun = Boolean(supabaseUrl && supabaseKey);

test("hosted Supabase health Edge Function responds successfully", { skip: !canRun }, async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/health`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "SNCBT Assess Backend");
});
