import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { credentialsFor, signIn } from "./helpers/auth";
import { watchPageProblems } from "./helpers/diagnostics";
import { e2eSetupOptions } from "./helpers/setup";

const instructorIt = credentialsFor("instructor")
  ? it
  : it.skip;

describe("instructor portal smoke", async () => {
  await setup(e2eSetupOptions());

  instructorIt("instructor can open core workspaces", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await signIn(page, "instructor");

    const paths = [
      "/instructor/dashboard",
      "/instructor/classes",
      "/instructor/assessments",
      "/instructor/student-progress",
      "/instructor/results",
      "/instructor/reports",
      "/instructor/archive",
    ];

    for (const path of paths) {
      await page.goto(url(path));
      await page.waitForURL(new RegExp(path.replaceAll("/", "\\/")));
      expect(page.url()).toMatch(new RegExp(path.replaceAll("/", "\\/")));
      expect((await page.locator("body").innerText())).not.toMatch(/500|Internal Server Error/i);
    }

    expect(problems).toEqual([]);
    await page.close();
  });

  instructorIt("question builder opens when a fixture assessment is configured", async () => {
    const assessmentId = process.env.E2E_INSTRUCTOR_ASSESSMENT_ID?.trim();
    if (!assessmentId) return;

    const page = await createPage();
    const problems = watchPageProblems(page);
    await signIn(page, "instructor");
    await page.goto(url(`/instructor/assessments/${assessmentId}/edit`));
    expect(await page.getByText(/Questions/i).first().isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /Add question/i }).isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });
});
