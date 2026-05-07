import { type JSX, useEffect, useState } from "react";
import type { TopDomainEntry } from "../../data/types.ts";
import type { DetailChartSeries } from "../../lib/dashboard-data.ts";
import { ActiveUsers } from "../charts/active-users.tsx";
import { ScoreTrend } from "../charts/score-trend.tsx";
import { StoriesVsComments } from "../charts/stories-vs-comments.tsx";
import { TopDomainsChart } from "../charts/top-domains.tsx";

export interface DetailChartsProps {
  series: DetailChartSeries;
  topDomains: readonly TopDomainEntry[];
}

const chartPlaceholders = [
  ["Stories vs Comments", "Stacked area"],
  ["Active users", "Distinct authors per day"],
  ["Top 10 domains", "Story count over the selected range"],
  ["Story score (median + p90)", "Daily quantiles"],
] as const;

const DetailChartsFallback = (): JSX.Element => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {chartPlaceholders.map(([title, description]) => (
      <section key={title} className="rounded-md border bg-card p-4">
        <header className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </header>
        <div className="h-[260px] w-full rounded-sm border border-dashed border-border/70 flex items-center justify-center text-xs text-muted-foreground">
          Charts load when JavaScript is available.
        </div>
      </section>
    ))}
  </div>
);

export const DetailCharts = ({ series, topDomains }: DetailChartsProps): JSX.Element => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <DetailChartsFallback />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StoriesVsComments stories={series.stories} comments={series.comments} />
      <ActiveUsers commenters={series.activeCommenters} submitters={series.activeSubmitters} />
      <TopDomainsChart entries={topDomains} />
      <ScoreTrend median={series.medianScore} p90={series.p90Score} />
    </div>
  );
};
