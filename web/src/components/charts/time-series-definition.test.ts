import { createChartScene, defaultChartTheme, defineChart, renderChartSvg } from "@tanstack/charts";
import { describe, expect, it } from "vitest";
import { seriesFormatters, seriesRows } from "./time-series-data.ts";
import { timeSeriesDefinition } from "./time-series-definition.ts";

const names = ["Stories", "Comments"] as const;
const rows = seriesRows(
  [
    { date: "2026-03-07", value: 0 },
    { date: "2026-03-08", value: 200 },
  ],
  [
    { date: "2026-03-08", value: 20000 },
    { date: "2026-03-07", value: 0 },
  ],
);
const size = { width: 294, height: 260 };
const sceneFor = (definition: ReturnType<typeof timeSeriesDefinition>) =>
  createChartScene(
    defineChart(definition.chart({ ...size, defaultTheme: defaultChartTheme })),
    size,
  );

describe("time series chart scenes", () => {
  it("joins by UTC date, even if the second series arrives in a different order", () => {
    expect(rows.map((row) => [row.date.toISOString(), row.a, row.b])).toEqual([
      ["2026-03-07T00:00:00.000Z", 0, 0],
      ["2026-03-08T00:00:00.000Z", 200, 20000],
    ]);
    expect(Number(rows[1]?.date) - Number(rows[0]?.date)).toBe(86400000);
  });

  it.each([
    false,
    true,
  ])("renders finite geometry with zeros on log scales (stacked=%s)", (stacked) => {
    const definition = timeSeriesDefinition(rows, names, [true, true], "log", stacked, "en-US");
    const scene = sceneFor(definition);
    expect(scene.scales.y?.domain[0]).toBe(1);
    expect(scene.points).toHaveLength(4);
    expect(
      scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    ).toBe(true);
    const svg = renderChartSvg(scene, { ariaLabel: "Chart", idPrefix: "test" });
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(
      scene.points.filter((point) => point.datum.a === 0).every((point) => point.yValue === 1),
    ).toBe(true);
  });

  it("reports each stacked series' own value, with visible color swatches", () => {
    const definition = timeSeriesDefinition(rows, names, [true, true], "linear", true, "en-US");
    const scene = sceneFor(definition);
    const points = scene.points.filter((point) => point.datum.a === 200);
    expect(points.map((point) => point.yValue)).toEqual([200, 20200]);
    const content = definition.tooltip.content(points);
    expect(content.title).toBe("Mar 8, 2026");
    expect(content.rows.map((row) => [row.label, row.value, row.color])).toEqual([
      ["Stories", "200", "var(--chart-1)"],
      ["Comments", "20,000", "var(--chart-2)"],
    ]);
  });

  it("keeps domains and colors stable when hiding one series", () => {
    const full = sceneFor(
      timeSeriesDefinition(rows, names, [true, true], "linear", false, "en-US"),
    );
    const single = sceneFor(
      timeSeriesDefinition(rows, names, [false, true], "linear", false, "en-US"),
    );
    expect(single.scales.x?.domain).toEqual(full.scales.x?.domain);
    expect(single.scales.y?.domain).toEqual(full.scales.y?.domain);
    expect(single.points.map((point) => point.groupLabel)).toEqual(["Comments", "Comments"]);
    expect(single.points[0]?.color).toBe(
      full.points.find((point) => point.groupLabel === "Comments")?.color,
    );
  });

  it("uses localized month/year headings for monthly buckets and UTC dates for daily buckets", () => {
    const monthly = seriesRows(
      [
        { date: "2025-12-01", value: 1 },
        { date: "2026-01-01", value: 2 },
      ],
      [],
    );
    const format = seriesFormatters(monthly, "de-DE");
    expect(format.heading(new Date("2026-01-01T00:00:00Z"))).toBe(
      new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", month: "long", year: "numeric" }).format(
        new Date("2026-01-01"),
      ),
    );
    expect(seriesFormatters(rows, "en-US").heading(new Date("2026-03-08"))).toBe("Mar 8, 2026");
  });
});
