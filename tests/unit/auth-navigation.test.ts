import { describe, expect, it } from "vitest";
import {
  getAccountDestination,
  isAppRole,
  resolveRequestedDestination,
} from "../../app/utils/auth-navigation";

describe("authentication navigation", () => {
  it("routes active accounts to the dashboard for their role", () => {
    expect(getAccountDestination({ role: "student", account_status: "active" })).toBe("/student/dashboard");
    expect(getAccountDestination({ role: "instructor", account_status: "active" })).toBe("/instructor/dashboard");
    expect(getAccountDestination({ role: "admin", account_status: "active" })).toBe("/admin/dashboard");
  });

  it("keeps non-active accounts out of role workspaces", () => {
    expect(getAccountDestination({ role: "instructor", account_status: "pending" })).toBe("/account-pending");
    expect(getAccountDestination({ role: "student", account_status: "suspended" })).toBe("/account-unavailable");
    expect(getAccountDestination({ role: "student", account_status: "rejected" })).toBe("/account-unavailable");
  });

  it("restricts requested destinations to the active user's role", () => {
    const student = { role: "student" as const, account_status: "active" as const };
    expect(resolveRequestedDestination(student, "/student/assessments")).toBe("/student/assessments");
    expect(resolveRequestedDestination(student, "/instructor/dashboard")).toBe("/student/dashboard");
    expect(resolveRequestedDestination(student, "//evil.example")).toBe("/student/dashboard");
    expect(resolveRequestedDestination(student, "https://evil.example")).toBe("/student/dashboard");
  });

  it("accepts only the three supported roles", () => {
    expect(isAppRole("student")).toBe(true);
    expect(isAppRole("instructor")).toBe(true);
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("teacher")).toBe(false);
    expect(isAppRole("")).toBe(false);
  });
});
