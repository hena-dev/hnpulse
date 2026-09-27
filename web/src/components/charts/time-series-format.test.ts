import { describe, expect, it } from "vitest";
import { seriesFormatters, seriesRows } from "./time-series-data.ts";

const rows = (start: string, next: string) =>
  seriesRows(
    [
      { date: start, value: 1 },
      { date: next, value: 2 },
    ],
    [],
  );

describe("time series date formatting", () => {
  it("distinguishes UTC month boundaries, years, and other days", () => {
    const format = seriesFormatters(rows("2026-03-01", "2026-03-02"), "en-US");
    expect(format.tick(new Date("2026-01-01"))).toBe("2026");
    expect(format.tick(new Date("2026-03-01"))).toBe("Mar");
    expect(format.tick(new Date("2026-03-08"))).toBe("Mar 8");
    expect(format.tick(new Date("2026-01-08"))).toBe("Jan 8");
    expect(format.tick(new Date("2026-03-08"), true)).toBe("Mar 8");
    expect(format.tick(new Date("2025-10-01"), true)).toBe("Oct 2025");
    expect(format.tick(new Date("2026-01-01"), true)).toBe("2026");
    expect(format.heading(new Date("2026-03-08"))).toBe("Mar 8, 2026");
  });

  it.each(["en-US", "ar-EG", "de-DE"])("formats a complete ISO week in %s", (locale) => {
    const format = seriesFormatters(rows("2026-03-02", "2026-03-09"), locale);
    const expected = new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(format.heading(new Date("2026-03-02"))).toBe(
      expected.formatRange(new Date("2026-03-02"), new Date("2026-03-08")),
    );
    expect(format.heading(new Date("2025-12-29"))).toBe(
      expected.formatRange(new Date("2025-12-29"), new Date("2026-01-04")),
    );
  });

  it.each(["en-US", "ar-EG", "de-DE"])("uses a long month and full year in %s", (locale) => {
    const format = seriesFormatters(rows("2026-02-01", "2026-03-01"), locale);
    const date = new Date("2026-09-01");
    expect(format.heading(date)).toBe(
      new Intl.DateTimeFormat(locale, {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
      }).format(date),
    );
  });
});
