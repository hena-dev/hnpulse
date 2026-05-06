import { type JSX, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";

export interface StoriesVsCommentsProps {
  stories: readonly BucketPoint[];
  comments: readonly BucketPoint[];
}

export const StoriesVsComments = ({ stories, comments }: StoriesVsCommentsProps): JSX.Element => {
  const data = stories.map((s, i) => ({
    date: s.date,
    stories: s.value,
    comments: comments[i]?.value ?? 0,
  }));
  const allValues = data.flatMap((d) => [d.stories, d.comments]);
  const offerLog = shouldOfferLogScale(allValues);
  const [scale, setScale] = useState<YScale>("linear");
  return (
    <ChartContainer
      title="Stories vs Comments"
      description="Stacked area"
      {...(offerLog ? { scale, onScaleChange: setScale } : {})}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            scale={scale}
            domain={scale === "log" ? [1, "auto"] : ["auto", "auto"]}
            allowDataOverflow={scale === "log"}
          />
          <Tooltip />
          <Area
            type="monotone"
            stackId="1"
            dataKey="stories"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.2}
          />
          <Area
            type="monotone"
            stackId="1"
            dataKey="comments"
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.4}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
