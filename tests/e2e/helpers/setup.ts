type E2EBrowser =
  | "chromium"
  | "firefox"
  | "webkit";

function browserType(): E2EBrowser {
  const requested =
    process.env.E2E_BROWSER
      ?.trim()
      .toLowerCase();

  if (
    requested === "firefox"
    || requested === "webkit"
    || requested === "chromium"
  ) {
    return requested;
  }

  return "chromium";
}

export function e2eSetupOptions() {
  const host =
    process.env.E2E_BASE_URL
      ?.trim();

  const channel =
    process.env.E2E_BROWSER_CHANNEL
      ?.trim();

  return {
    // Nuxt Test Utils has its own setup/teardown budgets. Keep these
    // explicit so slow Windows cold starts do not fall back to the shorter
    // default even when Vitest project hookTimeout is larger.
    setupTimeout: 300_000,
    teardownTimeout: 60_000,

    ...(host
      ? {
          host,
        }
      : {}),

    browser: true,

    browserOptions: {
      type: browserType(),

      launch: {
        headless:
          process.env.E2E_HEADLESS
          !== "false",

        ...(channel
          ? {
              channel,
            }
          : {}),
      },
    },
  };
}
