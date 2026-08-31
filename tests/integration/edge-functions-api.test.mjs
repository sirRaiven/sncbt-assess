import test from "node:test";
import assert from "node:assert/strict";
import { request } from "playwright-core";
import { loadLocalTestEnv } from "../helpers/load-test-env.mjs";

loadLocalTestEnv();

const supabaseUrl =
  (process.env.NUXT_PUBLIC_SUPABASE_URL || "")
    .replace(/\/+$/, "");

const supabaseKey =
  process.env.NUXT_PUBLIC_SUPABASE_KEY
  || "";

const canRun =
  Boolean(
    supabaseUrl
    && supabaseKey,
  );

const protectedFunctions = [
  "account-profile",
  "assessment-delivery",
  "assessment-import",
  "assessment-integrity",
  "assessment-monitor",
  "assessment-question-policy",
  "assessment-schedules",
  "assessment-sessions",
  "assessments",
  "classrooms",
  "dashboard-overview",
  "exam-attempts",
  "instructor-archive",
  "instructor-reports",
  "instructor-student-progress",
  "questions",
];

async function apiContext() {
  return await request.newContext({
    baseURL: supabaseUrl,
    extraHTTPHeaders: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    timeout: Number(
      process.env.E2E_MAX_API_MS
      || 8_000,
    ),
  });
}

test(
  "hosted Supabase health Edge Function responds through Playwright APIRequestContext",
  {
    skip: !canRun,
  },
  async () => {
    const api = await apiContext();

    try {
      const response = await api.post(
        "/functions/v1/health",
        {
          data: {},
        },
      );

      assert.equal(response.status(), 200);

      const body = await response.json();
      assert.equal(body.ok, true);
      assert.equal(body.service, "SNCBT Assess Backend");
    } finally {
      await api.dispose();
    }
  },
);

test(
  "deployed authenticated Edge Functions reject an anonymous smoke request without 5xx or missing-route failures",
  {
    skip: !canRun,
  },
  async (t) => {
    const api = await apiContext();

    try {
      for (const functionName of protectedFunctions) {
        await t.test(
          functionName,
          async () => {
            const response = await api.post(
              `/functions/v1/${functionName}`,
              {
                data: {},
              },
            );

            assert.notEqual(
              response.status(),
              404,
              `${functionName} is not deployed`,
            );

            assert.ok(
              response.status() < 500,
              `${functionName} returned server error ${response.status()}`,
            );
          },
        );
      }
    } finally {
      await api.dispose();
    }
  },
);
