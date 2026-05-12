import { describe, expect, it } from "vitest";
import { formatDateOnly, formatDateTime } from "./date.ts";

describe("formatDateOnly", () => {
  it("formats YYYY-MM-DD values in UTC", () => {
    expect(formatDateOnly("2026-05-05", "en-US")).toBe("May 5, 2026");
  });

  it("returns invalid input unchanged", () => {
    expect(formatDateOnly("not-a-date", "en-US")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("formats ISO datetimes in UTC", () => {
    expect(formatDateTime("2026-05-06T16:57:22.197Z", "en-US")).toContain("2026");
  });
});
