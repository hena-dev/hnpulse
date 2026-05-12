import type { JSX } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { TopDomainEntry } from "../../data/types.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import { ChartContainer } from "./chart-container.tsx";
import { ChartTooltip } from "./chart-tooltip.tsx";

export interface TopDomainsChartProps {
  entries: readonly TopDomainEntry[];
  messages: Messages["charts"];
}

export const TopDomainsChart = ({ entries, messages }: TopDomainsChartProps): JSX.Element => {
  const data = entries.map((e) => ({ name: e.name, stories: e.stories }));
  return (
    <ChartContainer title={messages.topDomainsTitle} description={messages.topDomainsDescription}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 8, left: 80, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
          <ChartTooltip />
          <Bar dataKey="stories" name={messages.seriesStories} fill="var(--chart-1)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
