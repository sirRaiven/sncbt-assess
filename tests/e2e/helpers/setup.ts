export function e2eSetupOptions() {
  const host = process.env.E2E_BASE_URL?.trim();

  return {
    ...(host ? { host } : {}),
    browser: true,
    browserOptions: {
      type: "chromium" as const,
      launch: {
        headless: process.env.E2E_HEADLESS !== "false",
      },
    },
  };
}
