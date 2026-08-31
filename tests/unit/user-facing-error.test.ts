import { describe, expect, it } from "vitest";
import { toUserFacingError } from "../../app/utils/user-facing-error";

describe("user-facing errors", () => {
  it("converts network errors into a safe connection message", () => {
    expect(toUserFacingError(new Error("Failed to fetch"))).toMatch(/couldn't connect to SNCBT Assess/i);
  });

  it("uses a user-friendly timeout message", () => {
    expect(toUserFacingError(new Error("request timeout"), undefined, "REQUEST_TIMEOUT")).toMatch(/taking longer than expected/i);
  });

  it("does not expose backend details for auth failures", () => {
    expect(toUserFacingError(new Error("JWT expired"), undefined, "UNAUTHORIZED", 401)).toMatch(/session has expired/i);
    expect(toUserFacingError(new Error("permission denied for relation assessments"), undefined, "FORBIDDEN", 403)).toMatch(/not available for your account/i);
  });

  it("uses a retry-later message for rate limits", () => {
    expect(toUserFacingError(new Error("too many requests"), undefined, null, 429)).toMatch(/wait a moment and try again/i);
  });

  it("preserves domain validation messages", () => {
    expect(toUserFacingError("This assessment is already closed.")).toBe("This assessment is already closed.");
  });

  it("falls back instead of leaking database implementation details", () => {
    const fallback = "The action could not be completed.";
    expect(toUserFacingError("foreign key constraint assessments_owner_id_fkey violated", fallback)).toBe(fallback);
  });
});
