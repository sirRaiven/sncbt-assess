import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root =
  new URL(
    "../../",
    import.meta.url,
  );

async function read(
  path,
) {
  return await readFile(
    new URL(
      path,
      root,
    ),
    "utf8",
  );
}

test(
  "PWA install support stays connected to the Nuxt app shell",
  async () => {
    const [
      packageJson,
      nuxtConfig,
      appVue,
      dashboardShell,
      authLayout,
      installButton,
    ] =
      await Promise.all([
        read("package.json"),
        read("nuxt.config.ts"),
        read("app/app.vue"),
        read(
          "app/components/DashboardShell.vue",
        ),
        read("app/layouts/auth.vue"),
        read(
          "app/components/PwaInstallButton.vue",
        ),
      ]);

    const pkg =
      JSON.parse(
        packageJson,
      );

    assert.equal(
      pkg.devDependencies[
        "@vite-pwa/nuxt"
      ],
      "^1.1.1",
    );

    assert.match(
      nuxtConfig,
      /"@vite-pwa\/nuxt"/,
    );

    assert.match(
      nuxtConfig,
      /installPrompt:\s*\n\s*true/,
    );

    assert.match(
      nuxtConfig,
      /navigateFallback:\s*\n\s*null/,
    );

    assert.match(
      appVue,
      /<NuxtPwaManifest\s*\/>/,
    );

    assert.match(
      dashboardShell,
      /<PwaInstallButton\s*\/>/,
    );

    assert.match(
      authLayout,
      /<PwaInstallButton\s*\/>/,
    );

    assert.match(
      installButton,
      /\/student\\\/assessments\\\/\[\^\/\]\+\\\/play/,
    );

    assert.match(
      installButton,
      /Internet connection is still required/,
    );
  },
);
