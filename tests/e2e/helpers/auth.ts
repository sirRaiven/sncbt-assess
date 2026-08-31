import { url } from "@nuxt/test-utils/e2e";
import type { Page } from "playwright-core";

export type TestRole = "student" | "instructor" | "admin";

function envKey(role: TestRole, suffix: "IDENTIFIER" | "PASSWORD"): string {
  return `E2E_${role.toUpperCase()}_${suffix}`;
}

export function credentialsFor(role: TestRole): { identifier: string; password: string } | null {
  const identifier = process.env[envKey(role, "IDENTIFIER")]?.trim() || "";
  const password = process.env[envKey(role, "PASSWORD")] || "";
  return identifier && password ? { identifier, password } : null;
}

export async function signIn(page: Page, role: TestRole): Promise<void> {
  const credentials = credentialsFor(role);
  if (!credentials) {
    throw new Error(`Missing E2E credentials for ${role}.`);
  }

  await page.goto(url("/"));
  await page.getByLabel("Username").fill(credentials.identifier);
  await page.getByRole("textbox", { name: /^Password\*?$/ }).fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(new RegExp(`/${role}/`), { timeout: 20_000 });
}
