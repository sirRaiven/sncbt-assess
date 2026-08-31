import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { e2eSetupOptions } from "./helpers/setup";

const maxPageLoadMs = Number(
  process.env.E2E_MAX_PAGE_LOAD_MS
  || 15_000,
);

describe("browser performance smoke", async () => {
  await setup(e2eSetupOptions());

  it("public sign-in stays inside the broad page-load budget", async () => {
    const page = await createPage();

    const startedAt = Date.now();

    await page.goto(
      url("/"),
      {
        waitUntil: "load",
      },
    );

    const wallClockMs =
      Date.now()
      - startedAt;

    const metrics = await page.evaluate(() => {
      const navigation =
        performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming | undefined;

      const resources =
        performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];

      return {
        navigationDurationMs:
          navigation?.duration
          ?? 0,
        domContentLoadedMs:
          navigation
            ? navigation.domContentLoadedEventEnd
              - navigation.startTime
            : 0,
        resourceCount:
          resources.length,
        slowestResourceMs:
          resources.reduce(
            (slowest, item) =>
              Math.max(
                slowest,
                item.duration,
              ),
            0,
          ),
      };
    });

    console.info(
      `[performance:${process.env.E2E_BROWSER || "chromium"}]`,
      {
        wallClockMs,
        ...metrics,
      },
    );

    expect(wallClockMs).toBeLessThan(maxPageLoadMs);

    if (
      metrics.navigationDurationMs
      > 0
    ) {
      expect(metrics.navigationDurationMs).toBeLessThan(maxPageLoadMs);
    }

    expect(metrics.resourceCount).toBeGreaterThan(0);

    await page.close();
  });
});
