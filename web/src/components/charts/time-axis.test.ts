import { createChartScene, defaultChartTheme, defineChart } from "@tanstack/charts";
import { describe, expect, it } from "vitest";
import { timeSeriesDefinition } from "./time-series-definition.ts";

const ranges = [
  ["1w", "2026-09-12", "2026-09-18"],
  ["1m", "2026-08-20", "2026-09-18"],
  ["3m", "2026-06-21", "2026-09-18"],
  ["6m", "2026-03-16", "2026-09-14"],
  ["1y", "2025-09-15", "2026-09-14"],
  ["2y", "2024-09-01", "2026-09-01"],
] as const;

describe.each(["en-US", "ar-EG"])("time axis density in %s", (locale) => {
  it.each(ranges)("keeps at least three consistent visible labels for %s", (_, start, end) => {
    for (const width of [294, 309, 516]) {
      const labels = [400000, 6000, 40].map((maximum, index) => {
        const rows = [start, end].map((date) => ({
          date: new Date(date),
          a: maximum,
          b: maximum / 10,
        }));
        const definition = timeSeriesDefinition(
          rows,
          ["A", "B"],
          [true, true],
          "linear",
          index === 0,
          locale,
        );
        const size = { width, height: 260 };
        const scene = createChartScene(
          defineChart(definition.chart({ ...size, defaultTheme: defaultChartTheme })),
          size,
        );
        const axes = scene.nodes.find((node) => node.key === "axes");
        const ticks =
          axes?.kind === "group"
            ? axes.children.filter(
                (node) => node.kind === "label" && node.key.startsWith("x-tick-label:"),
              )
            : [];
        expect(ticks.length).toBeGreaterThanOrEqual(3);
        return ticks.map((node) => (node.kind === "label" ? node.text : ""));
      });
      expect(labels[0]).toEqual(labels[1]);
      expect(labels[0]).toEqual(labels[2]);
    }
  });
});
