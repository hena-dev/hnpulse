import { scaleUtc } from "d3-scale";
import { chartAxis } from "./chart-theme.ts";
import type { SeriesRow } from "./time-series-data.ts";

export const timeAxis = (
  rows: readonly SeriesRow[],
  width: number,
  format: (value: Date, first: boolean) => string,
) => {
  const start = rows[0]?.date ?? new Date(0);
  const end = rows.at(-1)?.date ?? new Date(86400000);
  const scale = scaleUtc().domain([start, end]);
  const count = Math.max(3, Math.floor((width - 60) / 85));
  // Exact candidates keep equal-width cards consistent despite different y-axis margins.
  let hint = count;
  let candidates = scale.ticks(hint);
  while (candidates.length < 3 && hint < 12) candidates = scale.ticks(++hint);
  const stride = Math.max(
    1,
    Math.min(Math.ceil(candidates.length / (count + 1)), Math.floor(candidates.length / 3)),
  );
  const january = candidates.findIndex(
    (date) => date.getUTCMonth() === 0 && date.getUTCDate() === 1,
  );
  const offset = january < 0 ? 0 : january % stride;
  const values = candidates.filter((_, index) => index % stride === offset);
  return {
    scale,
    grid: false,
    axis: {
      ...chartAxis,
      ticks: {
        size: 0,
        values,
        format: (value: Date) => format(value, Number(value) === Number(values[0])),
      },
      tickLabels: { fontSize: 11, thin: false },
    },
  };
};
