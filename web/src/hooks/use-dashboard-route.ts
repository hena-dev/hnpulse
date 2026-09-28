import { useCallback, useEffect, useState } from "react";
import type { SnapshotBounds } from "../data/types.ts";
import {
  type Locale,
  localeFromPathname,
  localizedRangePath,
  rangeFromPathname,
} from "../lib/i18n/config.ts";
import type { RangeId } from "../lib/range/range.ts";
import { datedPath, snapshotDate } from "../lib/snapshots/date.ts";

export const useDashboardRoute = (locale: Locale, range: RangeId, bounds?: SnapshotBounds) => {
  const [route, setRoute] = useState({ locale, range, date: null as string | null, ready: false });
  useEffect(() => {
    const sync = () => {
      const date = snapshotDate(window.location.search, bounds);
      if (date === null && new URLSearchParams(window.location.search).has("date")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("date");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
      setRoute((previous) => ({
        locale: localeFromPathname(window.location.pathname),
        range: rangeFromPathname(window.location.pathname, previous.range),
        date,
        ready: true,
      }));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [bounds]);
  const navigate = useCallback((next: { locale: Locale; range: RangeId; date: string | null }) => {
    const href = datedPath(localizedRangePath(next.locale, next.range), next.date);
    if (window.location.pathname + window.location.search !== href)
      window.history.pushState(null, "", href);
    setRoute({ ...next, ready: true });
  }, []);
  return { ...route, navigate };
};
