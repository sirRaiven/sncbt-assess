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
