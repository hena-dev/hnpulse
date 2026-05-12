import type { JSX } from "react";
import type { MetaJson } from "../../data/types.ts";
import type { DashboardData } from "../../lib/dashboard-data.ts";
import type { RangeId } from "../../lib/range/range.ts";
import { DetailCharts } from "../dashboard/detail-charts.tsx";
import { KpiGrid } from "../dashboard/kpi-grid.tsx";

export interface DashboardViewProps {
  dashboard: DashboardData;
  chartDashboard: DashboardData;
  meta: MetaJson;
  range: RangeId;
  onRangeChange: (range: RangeId) => void;
}

export const DashboardView = ({
  dashboard,
  chartDashboard,
  meta,
  range,
  onRangeChange,
}: DashboardViewProps): JSX.Element => (
  <>
    <main className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-6">
      <KpiGrid
        summaries={dashboard.summaries}
        topDomain={dashboard.topDomain}
        meta={meta}
        range={range}
        onRangeChange={onRangeChange}
      />
      <DetailCharts series={chartDashboard.detailSeries} topDomains={chartDashboard.topDomains} />
    </main>
    <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">
      Built by hena ·{" "}
      <a
        href="https://github.com/hena-dev/hnpulse"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Repo
      </a>{" "}
      · last updated {meta.lastUpdated}
    </footer>
  </>
);
