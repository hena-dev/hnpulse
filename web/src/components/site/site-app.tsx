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
import { AboutContent } from "../about/about-content.tsx";
import { DashboardView } from "./dashboard-view.tsx";
import { SiteHeader, type SiteHref, type SitePage } from "./site-header.tsx";

export interface SiteAppProps {
  initialPage: SitePage;
  initialRange: RangeId;
  ranges: DashboardDataByRange;
  meta: MetaJson;
}

const isRangeId = (value: string): value is RangeId =>
  (RANGE_IDS as readonly string[]).includes(value);

const routeFromPath = (fallbackRange: RangeId): { page: SitePage; range: RangeId } => {
  /* v8 ignore next -- this module is rendered on the server before hydrating in the browser. */
  if (typeof window === "undefined") return { page: "dashboard", range: fallbackRange };
  const segment = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  if (segment === "about") return { page: "about", range: fallbackRange };
  return { page: "dashboard", range: isRangeId(segment) ? segment : fallbackRange };
};

const shouldHandleClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const SiteApp = ({ initialPage, initialRange, ranges, meta }: SiteAppProps): JSX.Element => {
  const [page, setPage] = useState<SitePage>(initialPage);
  const [range, setRange] = useState<RangeId>(initialRange);
  const [chartRange, setChartRange] = useState<RangeId>(initialRange);
  const dashboard = ranges[range];
  const chartDashboard = ranges[chartRange];

  const setDashboardRange = useCallback((next: RangeId): void => {
    setRange(next);
    startTransition(() => setChartRange(next));
  }, []);

  const applyRoute = useCallback(
    (nextPage: SitePage, nextRange: RangeId): void => {
      setPage(nextPage);
      if (nextPage === "dashboard") setDashboardRange(nextRange);
    },
    [setDashboardRange],
  );

  const navigate = (href: SiteHref): void => {
    const nextPage = href === "/about" ? "about" : "dashboard";
    const nextRange = href === "/about" ? range : (href.slice(1) as RangeId);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    applyRoute(nextPage, nextRange);
    if (nextPage === "about") window.scrollTo({ left: 0, top: 0, behavior: "instant" });
  };

  const handleNav = (href: SiteHref) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleClick(event)) return;
    event.preventDefault();
    navigate(href);
  };

  useEffect(() => {
    const onPopState = (): void => {
      const next = routeFromPath(range);
      applyRoute(next.page, next.range);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyRoute, range]);

  useEffect(() => {
    document.title = page === "about" ? "About HN Pulse" : "HN Pulse — Hacker News, daily vitals";
  }, [page]);

  return (
    <>
      <SiteHeader page={page} onNavigate={handleNav} />
      {page === "about" ? (
        <AboutContent />
      ) : (
        <DashboardView
          dashboard={dashboard}
          chartDashboard={chartDashboard}
          meta={meta}
          range={range}
          onRangeChange={(next) => navigate(`/${next}`)}
        />
      )}
    </>
  );
};
