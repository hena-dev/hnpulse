import { type JSX, useMemo } from "react";
import type { KpisJson } from "../../data/types.ts";
import { topDomainsForRange } from "../../lib/kpi/top-domains.ts";
import { bucketForRange, bucketSeries } from "../../lib/range/bucket.ts";
import { RANGE_DAYS, type RangeId, sliceSeries } from "../../lib/range/range.ts";
import { ActiveUsers } from "../charts/active-users.tsx";
import { ScoreTrend } from "../charts/score-trend.tsx";
import { StoriesVsComments } from "../charts/stories-vs-comments.tsx";
import { TopDomainsChart } from "../charts/top-domains.tsx";

export interface DetailChartsProps {
  kpis: KpisJson;
  range: RangeId;
}

export const DetailCharts = ({ kpis, range }: DetailChartsProps): JSX.Element => {
  const days = RANGE_DAYS[range];
  const bucket = bucketForRange(range);
  const dayLabels = useMemo(() => sliceSeries(kpis.days, days), [kpis.days, days]);
  const sliceMetric = (key: keyof typeof kpis.metrics) =>
    bucketSeries(dayLabels, sliceSeries(kpis.metrics[key], days), bucket);
  const recentDomainDays = useMemo(
    () => kpis.topDomainsByDay.slice(-days),
    [kpis.topDomainsByDay, days],
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StoriesVsComments stories={sliceMetric("stories")} comments={sliceMetric("comments")} />
      <ActiveUsers
        commenters={sliceMetric("activeCommenters")}
        submitters={sliceMetric("activeSubmitters")}
      />
      <TopDomainsChart entries={topDomainsForRange(recentDomainDays, 10)} />
      <ScoreTrend median={sliceMetric("medianScore")} p90={sliceMetric("p90Score")} />
    </div>
  );
};
