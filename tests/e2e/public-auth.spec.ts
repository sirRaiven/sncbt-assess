import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { watchPageProblems } from "./helpers/diagnostics";
import { e2eSetupOptions } from "./helpers/setup";

describe("public authentication surfaces", async () => {
  await setup(e2eSetupOptions());

  it("sign-in page renders the primary account controls without browser errors", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await page.goto(url("/"));

    expect(await page.getByRole("heading", { name: "Welcome back" }).isVisible()).toBe(true);
    expect(await page.getByLabel("Username").isVisible()).toBe(true);
    expect(await page.getByRole("textbox", { name: /^Password\*?$/ }).isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /show password/i }).isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /sign in/i }).isVisible()).toBe(true);
    expect(await page.getByRole("link", { name: /forgot password/i }).isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });

  it("registration page exposes the student/instructor account form", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await page.goto(url("/register"));

    expect(await page.getByText(/Register using your assigned Student Number or Employee Number/i).isVisible()).toBe(true);
    expect(await page.getByLabel("First name").isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });

  it("password recovery page is accessible", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await page.goto(url("/forgot-password"));

    expect(await page.getByRole("heading", { name: /Recover your password/i }).isVisible()).toBe(true);
    expect(await page.getByLabel("Email address").isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /Send Reset Link/i }).isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });

  it("mobile sign-in stays usable at a student-sized viewport", async () => {
    const page = await createPage();
    const problems = watchPageProblems(page);
    await page.goto(url("/"));

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.getByLabel("Username").isVisible()).toBe(true);
    expect(await page.getByRole("textbox", { name: /^Password\*?$/ }).isVisible()).toBe(true);
    expect(await page.getByRole("button", { name: /sign in/i }).isVisible()).toBe(true);
    expect(problems).toEqual([]);
    await page.close();
  });
});
