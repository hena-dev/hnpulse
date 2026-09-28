import { describe, expect, it } from "vitest";
import { parseMeta } from "../../data/schema.ts";
import { bounds, metaFixture } from "../../data/snapshot.test.fixture.ts";
import { LOCALES } from "../i18n/config.ts";
import { addDays, datedPath, firstSnapshotDay, isSnapshotDay, snapshotDate } from "./date.ts";
import { snapshotIntlLocale, snapshotMessages } from "./messages.ts";

describe("snapshot date contract", () => {
  it.each([
    "2025-1-01",
    "2025-02-29",
    "2024-02-30",
    "2025-13-01",
    "2025-00-00",
    "no",
    "2025-01-01T00:00:00Z",
  ])("rejects %s", (day) => {
    expect(isSnapshotDay(day)).toBe(false);
  });
  it("handles leap years and UTC rollover", () => {
    expect(isSnapshotDay("2024-02-29")).toBe(true);
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
    expect(addDays("2025-01-01", -1)).toBe("2024-12-31");
  });
  it("uses inclusive publication bounds and normalizes invalid queries", () => {
    expect(snapshotDate("?date=2025-01-01", bounds)).toBe(bounds.first);
    expect(snapshotDate("?date=2025-01-17", bounds)).toBe(bounds.last);
    for (const query of [
      "",
      "?date=",
      "?date=2024-12-31",
      "?date=2025-01-18",
      "?date=bad",
      "?date=2025-01-01&date=2025-01-02",
    ]) {
      expect(snapshotDate(query, bounds)).toBeNull();
    }
    expect(snapshotDate("?date=2025-01-01")).toBeNull();
    expect(firstSnapshotDay({ ...bounds, first: "2024-01-01" })).toBe("2025-01-01");
    expect(firstSnapshotDay({ ...bounds, first: "2025-01-03" })).toBe("2025-01-03");
    expect(datedPath("/fa/1w", bounds.first)).toBe("/fa/1w?date=2025-01-01");
    expect(datedPath("/1m", null)).toBe("/1m");
  });
  it("accepts optional metadata and rejects inconsistent publication bounds", () => {
    expect(parseMeta(metaFixture).snapshots).toEqual(bounds);
    expect(parseMeta({ ...metaFixture, snapshots: undefined }).snapshots).toBeUndefined();
    for (const snapshots of [
      { ...bounds, first: "2025-02-01" },
      { ...bounds, finalThrough: "2025-02-01" },
    ]) {
      expect(() => parseMeta({ ...metaFixture, snapshots })).toThrow();
    }
  });
  it.each(LOCALES)("has complete calendar copy for %s", (locale) => {
    expect(Object.values(snapshotMessages(locale)).every((value) => value.length > 0)).toBe(true);
    expect(snapshotMessages(locale).estimate).toContain("{date}");
    expect(new Intl.DateTimeFormat(snapshotIntlLocale(locale)).resolvedOptions().calendar).toBe(
      "gregory",
    );
  });
});
