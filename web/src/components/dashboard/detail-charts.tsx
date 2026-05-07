import type { JSX } from "react";
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

export const DetailCharts = ({ series, topDomains }: DetailChartsProps): JSX.Element => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <StoriesVsComments stories={series.stories} comments={series.comments} />
    <ActiveUsers commenters={series.activeCommenters} submitters={series.activeSubmitters} />
    <TopDomainsChart entries={topDomains} />
    <ScoreTrend median={series.medianScore} p90={series.p90Score} />
  </div>
);
