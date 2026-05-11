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
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { DashboardView } from "./dashboard-view.tsx";
import { SiteHeader, type SiteHref } from "./site-header.tsx";

export interface SiteAppProps {
  initialRange: RangeId;
  ranges: DashboardDataByRange;
  meta: MetaJson;
}

const isRangeId = (value: string): value is RangeId =>
  (RANGE_IDS as readonly string[]).includes(value);

const routeFromPath = (fallbackRange: RangeId): RangeId => {
  /* v8 ignore next -- this module is rendered on the server before hydrating in the browser. */
  if (typeof window === "undefined") return fallbackRange;
  const segment = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  return isRangeId(segment) ? segment : fallbackRange;
};

const shouldHandleClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const SiteApp = ({ initialRange, ranges, meta }: SiteAppProps): JSX.Element => {
  const [range, setRange] = useState<RangeId>(initialRange);
  const [chartRange, setChartRange] = useState<RangeId>(initialRange);
  const dashboard = ranges[range];
  const chartDashboard = ranges[chartRange];

  const setDashboardRange = useCallback((next: RangeId): void => {
    setRange(next);
    startTransition(() => setChartRange(next));
  }, []);

  const navigate = (href: SiteHref): void => {
    const nextRange = href.slice(1) as RangeId;
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    setDashboardRange(nextRange);
  };

  const handleNav = (href: SiteHref) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleClick(event)) return;
    event.preventDefault();
    navigate(href);
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
      <SiteHeader onNavigate={handleNav} />
      <DashboardView
        dashboard={dashboard}
        chartDashboard={chartDashboard}
        meta={meta}
        range={range}
        onRangeChange={(next) => navigate(`/${next}`)}
      />
    </>
  );
};
