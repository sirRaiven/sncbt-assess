import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

type E2EBrowser =
  | "chromium"
  | "firefox"
  | "webkit";

function parseEnvFile(
  path: string,
): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const values:
    Record<string, string> = {};

  for (
    const rawLine
    of readFileSync(
      path,
      "utf8",
    ).split(/\r?\n/)
  ) {
    const line =
      rawLine.trim();

    if (
      !line
      || line.startsWith("#")
    ) {
      continue;
    }

    const separator =
      line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key =
      line
        .slice(0, separator)
        .trim();

    let value =
      line
        .slice(separator + 1)
        .trim();

    if (
      (
        value.startsWith('"')
        && value.endsWith('"')
      )
      || (
        value.startsWith("'")
        && value.endsWith("'")
      )
    ) {
      value =
        value.slice(1, -1);
    }

    values[key] =
      value;
  }

  return values;
}

function localTestEnv():
  Record<string, string> {
  return {
    ...parseEnvFile(
      resolve(
        process.cwd(),
        ".env",
      ),
    ),
    ...parseEnvFile(
      resolve(
        process.cwd(),
        ".env.test",
      ),
    ),
  };
}

function e2eProject(
  name: string,
  browser: E2EBrowser,
  testEnv: Record<string, string>,
  channel?: "chrome" | "msedge",
) {
  return {
    test: {
      name,
      include: [
        "tests/e2e/**/*.{test,spec}.ts",
      ],
      environment: "node",
      testTimeout: 45_000,
      hookTimeout: 120_000,
      fileParallelism: false,
      env: {
        ...testEnv,
        E2E_BROWSER:
          browser,
        E2E_BROWSER_CHANNEL:
          channel
          || "",
      },
    },
  };
}

export default defineConfig(
  async () => {
    // Test files may check credentials at module load time, so load the local
    // test environment before Vitest workers import those files. `.env.test`
    // intentionally overrides `.env` for dedicated test credentials/hosts.
    const testEnv =
      localTestEnv();

    for (
      const [key, value]
      of Object.entries(testEnv)
    ) {
      if (
        process.env[key]
        === undefined
      ) {
        process.env[key] =
          value;
      }
    }

    return {
      test: {
        projects: [
          {
            test: {
              name: "unit",
              include: [
                "tests/unit/**/*.{test,spec}.ts",
              ],
              environment: "node",
            },
          },

          await defineVitestProject({
            test: {
              name: "nuxt",
              include: [
                "tests/nuxt/**/*.{test,spec}.ts",
              ],
              environment: "nuxt",
              // Nuxt runtime setup performs a full app initialization for
              // each test file. On Windows/cold caches this can legitimately
              // exceed Vitest's 10-second default hook timeout.
              hookTimeout: 60_000,
              testTimeout: 30_000,
              // Running Nuxt-runtime files sequentially avoids competing app
              // initializations and is more stable on developer machines.
              fileParallelism: false,
              environmentOptions: {
                nuxt: {
                  domEnvironment:
                    "happy-dom",
                },
              },
            },
          }),

          e2eProject(
            "e2e-chromium",
            "chromium",
            testEnv,
          ),

          e2eProject(
            "e2e-firefox",
            "firefox",
            testEnv,
          ),

          e2eProject(
            "e2e-webkit",
            "webkit",
            testEnv,
          ),

          e2eProject(
            "e2e-chrome",
            "chromium",
            testEnv,
            "chrome",
          ),

          e2eProject(
            "e2e-edge",
            "chromium",
            testEnv,
            "msedge",
          ),
        ],

        coverage: {
          provider: "v8",
          reporter: [
            "text",
            "html",
            "lcov",
          ],
          reportsDirectory:
            "coverage",
        },
      },
    };
  },
);
