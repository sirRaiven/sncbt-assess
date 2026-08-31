import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { e2eSetupOptions } from "./helpers/setup";

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

const apiIt = canRun
  ? it
  : it.skip;

const maxApiMs = Number(
  process.env.E2E_MAX_API_MS
  || 8_000,
);

describe("browser-to-Edge-Function compatibility", async () => {
  await setup(e2eSetupOptions());

  apiIt("browser fetch can reach the public health API with CORS and JSON intact", async () => {
    const page = await createPage();
    await page.goto(url("/"));

    const result = await page.evaluate(
      async ({ url, key }) => {
        const started = performance.now();

        try {
          const response = await fetch(
            `${url}/functions/v1/health`,
            {
              method: "POST",
              headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: "{}",
            },
          );

          const body = await response.json();

          return {
            networkError: null,
            status: response.status,
            body,
            durationMs:
              performance.now()
              - started,
          };
        } catch (error) {
          return {
            networkError:
              error instanceof Error
                ? error.message
                : String(error),
            status: 0,
            body: null,
            durationMs:
              performance.now()
              - started,
          };
        }
      },
      {
        url: supabaseUrl,
        key: supabaseKey,
      },
    );

    expect(result.networkError).toBeNull();
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      service: "SNCBT Assess Backend",
    });
    expect(result.durationMs).toBeLessThan(maxApiMs);

    await page.close();
  });

  apiIt("browser fetch reaches an authenticated API without CORS or server failures", async () => {
    const page = await createPage();
    await page.goto(url("/"));

    const result = await page.evaluate(
      async ({ url, key }) => {
        const started = performance.now();

        try {
          const response = await fetch(
            `${url}/functions/v1/assessment-delivery`,
            {
              method: "POST",
              headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "list-student-deliveries",
              }),
            },
          );

          return {
            networkError: null,
            status: response.status,
            durationMs:
              performance.now()
              - started,
          };
        } catch (error) {
          return {
            networkError:
              error instanceof Error
                ? error.message
                : String(error),
            status: 0,
            durationMs:
              performance.now()
              - started,
          };
        }
      },
      {
        url: supabaseUrl,
        key: supabaseKey,
      },
    );

    expect(result.networkError).toBeNull();
    expect(result.status).not.toBe(404);
    expect(result.status).toBeLessThan(500);
    expect(result.durationMs).toBeLessThan(maxApiMs);

    await page.close();
  });
});
