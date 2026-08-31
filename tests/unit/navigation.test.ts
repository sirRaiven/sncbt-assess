import { describe, expect, it } from "vitest";
import { getNavigation, getRoleLabel } from "../../app/utils/navigation";

describe("application navigation", () => {
  it("gives each role a non-empty model with unique destinations", () => {
    for (const role of ["student", "instructor", "admin"] as const) {
      const items = getNavigation(role);
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((item) => item.to)).size).toBe(items.length);
      expect(items.every((item) => item.to.startsWith(`/${role}/`))).toBe(true);
    }
  });

  it("includes direct Student Results access for instructors", () => {
    const labels = getNavigation("instructor").map((item) => item.label);
    expect(labels).toContain("Student Results");
    expect(labels).toContain("Student Progress");
    expect(labels).not.toContain("Reports");
  });

  it("includes a non-destructive Student archive destination", () => {
    const items = getNavigation("student");
    const archive = items.find((item) => item.label === "Archive");

    expect(archive?.to).toBe("/student/archive");
  });

  it("keeps role labels human-readable", () => {
    expect(getRoleLabel("student")).toBe("Student");
    expect(getRoleLabel("instructor")).toBe("Instructor");
    expect(getRoleLabel("admin")).toBe("System Administrator");
  });
});
