import { describe, expect, it } from "vitest";
import {
  formatPhilippineDateTime,
  philippineDateInput,
  philippineLocalInputToIso,
  toPhilippineLocalInput,
} from "../../app/utils/philippine-time";

describe("Philippine time utilities", () => {
  it("converts Philippine datetime-local values to UTC", () => {
    expect(
      philippineLocalInputToIso("2026-09-10T08:30"),
    ).toBe("2026-09-10T00:30:00.000Z");
  });

  it("formats UTC instants back to Philippine datetime-local values", () => {
    expect(
      toPhilippineLocalInput("2026-09-10T16:30:00.000Z"),
    ).toBe("2026-09-11T00:30");
  });

  it("rejects invalid Philippine civil dates", () => {
    expect(
      philippineLocalInputToIso("2026-02-30T10:00"),
    ).toBeNull();
    expect(
      philippineLocalInputToIso("not-a-date"),
    ).toBeNull();
  });

  it("formats display dates explicitly in Philippine Time", () => {
    expect(
      formatPhilippineDateTime(
        "2026-09-10T16:30:00.000Z",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        },
      ),
    ).toContain("09/11/2026");
  });

  it("uses the Philippine calendar date for date-only inputs", () => {
    expect(
      philippineDateInput("2026-09-10T16:30:00.000Z"),
    ).toBe("2026-09-11");
  });
});
