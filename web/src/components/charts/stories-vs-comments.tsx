import { type JSX, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";
import { ChartTooltip } from "./chart-tooltip.tsx";

export interface StoriesVsCommentsProps {
  stories: readonly BucketPoint[];
  comments: readonly BucketPoint[];
  messages: Messages["charts"];
}

export const StoriesVsComments = ({
  stories,
  comments,
  messages,
}: StoriesVsCommentsProps): JSX.Element => {
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
      title={messages.storiesVsCommentsTitle}
      description={messages.storiesVsCommentsDescription}
      scaleAriaLabel={messages.scaleAria}
      scaleLabels={{ linear: messages.scaleLinear, log: messages.scaleLog }}
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
          <ChartTooltip />
          <Area
            type="monotone"
            stackId="1"
            dataKey="stories"
            name={messages.seriesStories}
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.2}
          />
          <Area
            type="monotone"
            stackId="1"
            dataKey="comments"
            name={messages.seriesComments}
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.4}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
