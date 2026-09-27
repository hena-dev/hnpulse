import { type ChartPoint, defineChart } from "@tanstack/charts";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { portal } from "@tanstack/charts/tooltip/portal";
import { scaleLog } from "d3-scale";
import { formatCount } from "../../lib/format/number.ts";
import type { YScale } from "./chart-container.tsx";
import { chartAxis, chartTheme } from "./chart-theme.ts";
import { timeAxis } from "./time-axis.ts";
import { type SeriesRow, seriesFormatters } from "./time-series-data.ts";
import { seriesMarks } from "./time-series-marks.ts";

export const timeSeriesDefinition = (
  rows: readonly SeriesRow[],
  names: readonly [string, string],
  visible: readonly [boolean, boolean],
  scale: YScale,
  stacked: boolean,
  locale: string,
) => {
  const format = seriesFormatters(rows, locale);
  const maximum = Math.max(
    1,
    ...rows.map((row) => (stacked ? row.a + row.b : Math.max(row.a, row.b))),
  );
  const marks = seriesMarks(rows, names, visible, scale, stacked);
  return defineChart({
    chart: ({ width }) => ({
      marks,
      scales: {
        x: timeAxis(rows, width, format.tick),
        y: {
          scale:
            scale === "log"
              ? scaleLog().domain([1, Math.max(10, maximum)])
              : scaleLinear().domain([0, maximum]),
          nice: true,
          grid: { stroke: "var(--border)", strokeOpacity: 0.6 },
          axis: { ...chartAxis, ticks: { size: 0, count: 4, format: format.number } },
        },
      },
      color: { domain: [...names], range: chartTheme.palette.slice(0, 2) },
      theme: chartTheme,
      gradients: [0, 1].map((index) => ({
        id: `series-${index}`,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          { offset: 0, color: `var(--ts-chart-${index + 1})`, opacity: 0.35 },
          { offset: 1, color: `var(--ts-chart-${index + 1})`, opacity: 0.04 },
        ],
      })),
      clip: true,
    }),
    focus: "group-x",
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      portal,
      className: "detail-chart-tooltip",
      anchor: { x: "value", y: "plot-top" },
      placement: ["top", "bottom"],
      sort: "color-domain",
      content: (points: readonly ChartPoint<SeriesRow, Date, number>[]) => ({
        title: points[0] ? format.heading(points[0].datum.date) : "",
        rows: points.map((point) => ({
          label: point.groupLabel,
          value: formatCount(point.groupLabel === names[0] ? point.datum.a : point.datum.b, locale),
          color: point.groupLabel === names[0] ? "var(--chart-1)" : "var(--chart-2)",
        })),
      }),
    },
  });
};
