import { areaY, d3Curve, dot, lineY, whenFocused } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { decorative } from "@tanstack/charts/mark/decorative";
import { curveMonotoneX } from "d3-shape";
import type { YScale } from "./chart-container.tsx";
import type { SeriesRow } from "./time-series-data.ts";

export const seriesMarks = (
  rows: readonly SeriesRow[],
  names: readonly [string, string],
  visible: readonly [boolean, boolean],
  scale: YScale,
  stacked: boolean,
) => {
  const curve = d3Curve(curveMonotoneX);
  const positive = (value: number) => (scale === "log" ? Math.max(1, value) : value);
  const marks = ([0, 1] as const)
    .filter((index) => visible[index])
    .flatMap((index) => {
      const y = (row: SeriesRow) => positive(index === 0 ? row.a : stacked ? row.a + row.b : row.b);
      const color = () => names[index];
      const line = lineY(rows, {
        x: "date",
        y,
        color,
        curve,
        strokeWidth: 2,
        ...(index === 1 && !stacked ? { strokeDasharray: "5 4" } : {}),
      });
      const marker = whenFocused(
        dot(rows, {
          x: "date",
          y,
          color,
          r: 3.5,
          stroke: "var(--card)",
          strokeWidth: 2,
        }),
        { match: "x" },
      );
      return stacked
        ? [
            areaY(rows, {
              x: "date",
              y1: (row) => positive(index === 0 ? 0 : row.a),
              y2: y,
              color,
              curve,
              fill: `url(#series-${index})`,
            }),
            decorative(line),
            marker,
          ]
        : [line, marker];
    });
  return [
    ...marks,
    crosshair({
      x: { stroke: "var(--muted-foreground)", strokeOpacity: 0.4, strokeDasharray: "3 3" },
      y: false,
    }),
  ];
};
