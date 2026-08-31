import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { credentialsFor, signIn } from "./helpers/auth";
import { watchPageProblems } from "./helpers/diagnostics";
import { e2eSetupOptions } from "./helpers/setup";

const studentIt = credentialsFor("student")
  ? it
  : it.skip;

describe("student portal smoke", async () => {
  await setup(e2eSetupOptions());

  studentIt("student can open the primary portal destinations", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await signIn(page, "student");

    for (const path of ["/student/dashboard", "/student/classes", "/student/assessments", "/student/results", "/student/profile"]) {
      await page.goto(url(path));
      await page.waitForURL(new RegExp(path.replaceAll("/", "\\/")));
      expect(page.url()).toMatch(new RegExp(path.replaceAll("/", "\\/")));
      expect((await page.locator("body").innerText())).not.toMatch(/500|Internal Server Error/i);
    }

    expect(problems).toEqual([]);
    await page.close();
  });

  studentIt("assessment instructions can be opened when a fixture assessment is configured", async () => {
    const assessmentId = process.env.E2E_STUDENT_ASSESSMENT_ID?.trim();
    if (!assessmentId) return;

    const page = await createPage();
    const problems = watchPageProblems(page);
    await signIn(page, "student");
    await page.goto(url(`/student/assessments/${assessmentId}/instructions`));
    expect(await page.getByRole("button", { name: /Begin Assessment/i }).isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });
});
