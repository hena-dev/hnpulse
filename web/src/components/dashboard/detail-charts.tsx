import type { JSX } from "react";
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
  intlLocale: string;
  ofStories: string;
}

export const DetailCharts = ({
  series,
  topDomains,
  messages,
  intlLocale,
  ofStories,
}: DetailChartsProps): JSX.Element => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <StoriesVsComments
      stories={series.stories}
      comments={series.comments}
      messages={messages}
      intlLocale={intlLocale}
    />
    <ActiveUsers
      commenters={series.activeCommenters}
      submitters={series.activeSubmitters}
      messages={messages}
      intlLocale={intlLocale}
    />
    <TopDomainsChart
      entries={topDomains}
      messages={messages}
      intlLocale={intlLocale}
      ofStories={ofStories}
    />
    <ScoreTrend
      median={series.medianScore}
      p90={series.p90Score}
      messages={messages}
      intlLocale={intlLocale}
    />
  </div>
);
