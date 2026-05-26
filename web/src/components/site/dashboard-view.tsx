import type { JSX } from "react";
import type { MetaJson } from "../../data/types.ts";
import type { DashboardData } from "../../lib/dashboard-data.ts";
import { formatDateTime } from "../../lib/format/date.ts";
import type { Locale } from "../../lib/i18n/config.ts";
import { formatMessage } from "../../lib/i18n/format-message.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { RangeId } from "../../lib/range/range.ts";
import { DetailCharts } from "../dashboard/detail-charts.tsx";
import { KpiGrid } from "../dashboard/kpi-grid.tsx";
import { LanguageSwitcher } from "../language-switcher/language-switcher.tsx";

export interface DashboardViewProps {
  dashboard: DashboardData;
  chartDashboard: DashboardData;
  meta: MetaJson;
  range: RangeId;
  locale: Locale;
  messages: Messages;
  intlLocale: string;
  hrefForRange: (range: RangeId) => string;
  onRangeChange: (range: RangeId) => void;
  onLocaleChange: (locale: Locale) => void;
}

export const DashboardView = ({
  dashboard,
  chartDashboard,
  meta,
  range,
  locale,
  messages,
  intlLocale,
  hrefForRange,
  onRangeChange,
  onLocaleChange,
}: DashboardViewProps): JSX.Element => (
  <>
    <main className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-6">
      <KpiGrid
        summaries={dashboard.summaries}
        topDomain={dashboard.topDomain}
        meta={meta}
        range={range}
        messages={messages}
        intlLocale={intlLocale}
        hrefForRange={hrefForRange}
        onRangeChange={onRangeChange}
      />
      <DetailCharts
        series={chartDashboard.detailSeries}
        topDomains={chartDashboard.topDomains}
        messages={messages.charts}
      />
    </main>
    <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-2">
      <span>{messages.dashboard.footerBuiltBy}</span>
      <span aria-hidden="true">·</span>
      <a
        href="https://github.com/hena-dev/hnpulse"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {messages.dashboard.footerRepo}
      </a>
      <span aria-hidden="true">·</span>
      <span>
        {formatMessage(messages.dashboard.lastUpdated, {
          date: formatDateTime(meta.lastUpdated, intlLocale),
        })}
      </span>
      <span aria-hidden="true">·</span>
      <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} />
    </footer>
  </>
);
