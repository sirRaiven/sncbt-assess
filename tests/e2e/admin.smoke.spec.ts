import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { credentialsFor, signIn } from "./helpers/auth";
import { e2eSetupOptions } from "./helpers/setup";

const credentials = credentialsFor("admin");
const adminIt = credentials ? it : it.skip;

describe("administrator portal smoke", async () => {
  await setup(e2eSetupOptions());

  adminIt("administrator can open governance workspaces", async () => {
    const page = await createPage("/");
    await signIn(page, "admin");

    for (const path of ["/admin/dashboard", "/admin/users", "/admin/classes", "/admin/assessments", "/admin/audit-logs", "/admin/settings"]) {
      await page.goto(path);
      await page.waitForURL(new RegExp(path.replaceAll("/", "\\/")));
      expect(page.url()).toMatch(new RegExp(path.replaceAll("/", "\\/")));
      expect((await page.locator("body").innerText())).not.toMatch(/500|Internal Server Error/i);
    }

    await page.close();
  });
});
