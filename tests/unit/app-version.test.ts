import { describe, expect, it } from "vitest";
import {
  APP_INSTITUTION,
  APP_NAME,
  APP_VERSION,
  APP_VERSION_LABEL,
} from "../../app/utils/app-version";

describe("application version metadata", () => {
  it("stays internally consistent", () => {
    expect(APP_NAME).toBe("SNCBT Assess");
    expect(APP_VERSION_LABEL).toBe(`v${APP_VERSION}`);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_INSTITUTION).toMatch(/St\. Nicolas College/i);
  });
});
