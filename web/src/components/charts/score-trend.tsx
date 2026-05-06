import { type JSX, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";

export interface ScoreTrendProps {
  median: readonly BucketPoint[];
  p90: readonly BucketPoint[];
}

export const ScoreTrend = ({ median, p90 }: ScoreTrendProps): JSX.Element => {
  const data = median.map((m, i) => ({
    date: m.date,
    median: m.value,
    p90: p90[i]?.value ?? 0,
  }));
  const offerLog = shouldOfferLogScale(data.flatMap((d) => [d.median, d.p90]));
  const [scale, setScale] = useState<YScale>("linear");
  return (
    <ChartContainer
      title="Story score (median + p90)"
      description="Daily quantiles"
      {...(offerLog ? { scale, onScaleChange: setScale } : {})}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            scale={scale}
            domain={scale === "log" ? [1, "auto"] : ["auto", "auto"]}
            allowDataOverflow={scale === "log"}
          />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="median" stroke="var(--chart-1)" dot={false} />
          <Line
            type="monotone"
            dataKey="p90"
            stroke="var(--chart-2)"
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
