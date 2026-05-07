import { type JSX, startTransition, useCallback, useEffect, useState } from "react";
import type { MetaJson } from "../../data/types.ts";
import type { DashboardDataByRange } from "../../lib/dashboard-data.ts";
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { DetailCharts } from "./detail-charts.tsx";
import { KpiGrid } from "./kpi-grid.tsx";

export interface DashboardAppProps {
  initialRange: RangeId;
  ranges: DashboardDataByRange;
  meta: MetaJson;
}

const isRangeId = (value: string): value is RangeId =>
  (RANGE_IDS as readonly string[]).includes(value);

const rangeFromPath = (): RangeId | null => {
  if (typeof window === "undefined") return null;
  const segment = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  return isRangeId(segment) ? segment : null;
};

export const DashboardApp = ({ initialRange, ranges, meta }: DashboardAppProps): JSX.Element => {
  const [range, setRange] = useState<RangeId>(initialRange);
  const [chartRange, setChartRange] = useState<RangeId>(initialRange);
  const dashboard = ranges[range];
  const chartDashboard = ranges[chartRange];

  const setCurrentRange = useCallback((next: RangeId): void => {
    setRange(next);
    startTransition(() => setChartRange(next));
  }, []);

  const navigateRange = (next: RangeId): void => {
    if (next !== range) {
      window.history.pushState(null, "", `/${next}`);
    }
    setCurrentRange(next);
  };

  useEffect(() => {
    const onPopState = (): void => {
      const next = rangeFromPath();
      if (next !== null) setCurrentRange(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setCurrentRange]);

  return (
    <>
      <KpiGrid
        summaries={dashboard.summaries}
        topDomain={dashboard.topDomain}
        meta={meta}
        range={range}
        onRangeChange={navigateRange}
      />
      <DetailCharts series={chartDashboard.detailSeries} topDomains={chartDashboard.topDomains} />
    </>
  );
};
