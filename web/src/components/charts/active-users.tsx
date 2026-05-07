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
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";
import { ChartTooltip } from "./chart-tooltip.tsx";

export interface ActiveUsersProps {
  commenters: readonly BucketPoint[];
  submitters: readonly BucketPoint[];
}

export const ActiveUsers = ({ commenters, submitters }: ActiveUsersProps): JSX.Element => {
  const data = commenters.map((c, i) => ({
    date: c.date,
    commenters: c.value,
    submitters: submitters[i]?.value ?? 0,
  }));
  const offerLog = shouldOfferLogScale(data.flatMap((d) => [d.commenters, d.submitters]));
  const [scale, setScale] = useState<YScale>("linear");
  return (
    <ChartContainer
      title="Active users"
      description="Distinct authors per day"
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
          <Line type="monotone" dataKey="commenters" stroke="var(--chart-1)" dot={false} />
          <Line
            type="monotone"
            dataKey="submitters"
            stroke="var(--chart-2)"
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
