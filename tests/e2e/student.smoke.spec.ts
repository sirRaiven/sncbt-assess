import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { credentialsFor, signIn } from "./helpers/auth";
import { e2eSetupOptions } from "./helpers/setup";

const credentials = credentialsFor("student");
const studentIt = credentials ? it : it.skip;

describe("student portal smoke", async () => {
  await setup(e2eSetupOptions());

  studentIt("student can open the primary portal destinations", async () => {
    const page = await createPage("/");
    await signIn(page, "student");

    for (const path of ["/student/dashboard", "/student/classes", "/student/assessments", "/student/results", "/student/profile"]) {
      await page.goto(path);
      await page.waitForURL(new RegExp(path.replaceAll("/", "\\/")));
      expect(page.url()).toMatch(new RegExp(path.replaceAll("/", "\\/")));
      expect((await page.locator("body").innerText())).not.toMatch(/500|Internal Server Error/i);
    }

    await page.close();
  });

  studentIt("assessment instructions can be opened when a fixture assessment is configured", async () => {
    const assessmentId = process.env.E2E_STUDENT_ASSESSMENT_ID?.trim();
    if (!assessmentId) return;

    const page = await createPage("/");
    await signIn(page, "student");
    await page.goto(`/student/assessments/${assessmentId}/instructions`);
    expect(await page.getByRole("button", { name: /Begin Assessment/i }).isVisible()).toBe(true);
    await page.close();
  });
});
