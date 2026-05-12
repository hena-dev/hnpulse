import { type JSX, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";
import { ChartTooltip } from "./chart-tooltip.tsx";

export interface ScoreTrendProps {
  median: readonly BucketPoint[];
  p90: readonly BucketPoint[];
  messages: Messages["charts"];
}

export const ScoreTrend = ({ median, p90, messages }: ScoreTrendProps): JSX.Element => {
  const data = median.map((m, i) => ({
    date: m.date,
    median: m.value,
    p90: p90[i]?.value ?? 0,
  }));
  const offerLog = shouldOfferLogScale(data.flatMap((d) => [d.median, d.p90]));
  const [scale, setScale] = useState<YScale>("linear");
  return (
    <ChartContainer
      title={messages.scoreTrendTitle}
      description={messages.scoreTrendDescription}
      scaleAriaLabel={messages.scaleAria}
      scaleLabels={{ linear: messages.scaleLinear, log: messages.scaleLog }}
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
          <ChartTooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="median"
            name={messages.seriesMedian}
            stroke="var(--chart-1)"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p90"
            name={messages.seriesP90}
            stroke="var(--chart-2)"
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
