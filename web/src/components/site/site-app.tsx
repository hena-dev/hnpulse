import {
  type JSX,
  type MouseEvent,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { MetaJson } from "../../data/types.ts";
import type { DashboardDataByRange } from "../../lib/dashboard-data.ts";
import {
  DEFAULT_RANGE,
  LOCALE_CONFIGS,
  type Locale,
  localizedRangePath,
  rangeFromPathname,
} from "../../lib/i18n/config.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { RangeId } from "../../lib/range/range.ts";
import { DashboardView } from "./dashboard-view.tsx";
import { SiteHeader } from "./site-header.tsx";

export interface SiteAppProps {
  initialRange: RangeId;
  locale: Locale;
  messages: Messages;
  ranges: DashboardDataByRange;
  meta: MetaJson;
}

const routeFromPath = (fallbackRange: RangeId): RangeId => {
  /* v8 ignore next -- this module is rendered on the server before hydrating in the browser. */
  if (typeof window === "undefined") return fallbackRange;
  return rangeFromPathname(window.location.pathname, fallbackRange);
};

const shouldHandleClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const SiteApp = ({
  initialRange,
  locale,
  messages,
  ranges,
  meta,
}: SiteAppProps): JSX.Element => {
  const [range, setRange] = useState<RangeId>(initialRange);
  const [chartRange, setChartRange] = useState<RangeId>(initialRange);
  const dashboard = ranges[range];
  const chartDashboard = ranges[chartRange];
  const intlLocale = LOCALE_CONFIGS[locale].intlLocale;
  const hrefForRange = (next: RangeId): string => localizedRangePath(locale, next);

  const setDashboardRange = useCallback((next: RangeId): void => {
    setRange(next);
    startTransition(() => setChartRange(next));
  }, []);

  const navigate = (nextRange: RangeId): void => {
    const href = hrefForRange(nextRange);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    setDashboardRange(nextRange);
  };

  const handleNav = (nextRange: RangeId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleClick(event)) return;
    event.preventDefault();
    navigate(nextRange);
  };

  useEffect(() => {
    const onPopState = (): void => {
      setDashboardRange(routeFromPath(range));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [range, setDashboardRange]);

  return (
    <>
      <SiteHeader
        homeHref={hrefForRange(DEFAULT_RANGE)}
        themeToggleLabel={messages.theme.toggle}
        onHomeNavigate={handleNav(DEFAULT_RANGE)}
      />
      <DashboardView
        dashboard={dashboard}
        chartDashboard={chartDashboard}
        meta={meta}
        range={range}
        locale={locale}
        messages={messages}
        intlLocale={intlLocale}
        hrefForRange={hrefForRange}
        onRangeChange={(next) => navigate(next)}
      />
    </>
  );
};
