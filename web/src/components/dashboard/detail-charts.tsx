import { type JSX, useEffect, useState } from "react";
import type { TopDomainEntry } from "../../data/types.ts";
import type { DetailChartSeries } from "../../lib/dashboard-data.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import { ActiveUsers } from "../charts/active-users.tsx";
import { ScoreTrend } from "../charts/score-trend.tsx";
import { StoriesVsComments } from "../charts/stories-vs-comments.tsx";
import { TopDomainsChart } from "../charts/top-domains.tsx";

export interface DetailChartsProps {
  series: DetailChartSeries;
  topDomains: readonly TopDomainEntry[];
  messages: Messages["charts"];
}

const chartPlaceholders = (
  messages: Messages["charts"],
): readonly (readonly [string, string])[] => [
  [messages.storiesVsCommentsTitle, messages.storiesVsCommentsDescription],
  [messages.activeUsersTitle, messages.activeUsersDescription],
  [messages.topDomainsTitle, messages.topDomainsDescription],
  [messages.scoreTrendTitle, messages.scoreTrendDescription],
];

const DetailChartsFallback = ({ messages }: { messages: Messages["charts"] }): JSX.Element => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {chartPlaceholders(messages).map(([title, description]) => (
      <section key={title} className="rounded-md border bg-card p-4">
        <header className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </header>
        <div className="h-[260px] w-full rounded-sm border border-dashed border-border/70 flex items-center justify-center text-xs text-muted-foreground">
          {messages.unavailable}
        </div>
      </section>
    ))}
  </div>
);

export const DetailCharts = ({ series, topDomains, messages }: DetailChartsProps): JSX.Element => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <DetailChartsFallback messages={messages} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StoriesVsComments stories={series.stories} comments={series.comments} messages={messages} />
      <ActiveUsers
        commenters={series.activeCommenters}
        submitters={series.activeSubmitters}
        messages={messages}
      />
      <TopDomainsChart entries={topDomains} messages={messages} />
      <ScoreTrend median={series.medianScore} p90={series.p90Score} messages={messages} />
    </div>
  );
};
