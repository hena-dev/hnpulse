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
  localeFromPathname,
  localizedRangePath,
  openGraphLocale,
  rangeFromPathname,
} from "../../lib/i18n/config.ts";
import { loadMessages } from "../../lib/i18n/load-messages.ts";
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

interface RouteState {
  locale: Locale;
  range: RangeId;
}

interface MessageState {
  locale: Locale;
  messages: Messages;
}

const routeFromPath = (fallbackLocale: Locale, fallbackRange: RangeId): RouteState => {
  /* v8 ignore next -- this module is rendered on the server before hydrating in the browser. */
  if (typeof window === "undefined") return { locale: fallbackLocale, range: fallbackRange };
  return {
    locale: localeFromPathname(window.location.pathname),
    range: rangeFromPathname(window.location.pathname, fallbackRange),
  };
};

const shouldHandleClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const SiteApp = ({
  initialRange,
  locale: initialLocale,
  messages: initialMessages,
  ranges,
  meta,
}: SiteAppProps): JSX.Element => {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [range, setRange] = useState<RangeId>(initialRange);
  const [chartRange, setChartRange] = useState<RangeId>(initialRange);
  const [messageState, setMessageState] = useState<MessageState>({
    locale: initialLocale,
    messages: initialMessages,
  });
  const messages = messageState.messages;
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

  const navigateLocale = (nextLocale: Locale): void => {
    const href = localizedRangePath(nextLocale, range);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    setLocale(nextLocale);
  };

  const handleNav = (nextRange: RangeId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleClick(event)) return;
    event.preventDefault();
    navigate(nextRange);
  };

  useEffect(() => {
    const onPopState = (): void => {
      const next = routeFromPath(locale, range);
      setDashboardRange(next.range);
      setLocale(next.locale);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [locale, range, setDashboardRange]);

  useEffect(() => {
    if (messageState.locale === locale) return;

    let cancelled = false;
    void loadMessages(locale)
      .then((nextMessages) => {
        if (cancelled) return;
        startTransition(() => setMessageState({ locale, messages: nextMessages }));
      })
      /* v8 ignore next 4 -- only used if a generated locale chunk fails to load. */
      .catch(() => {
        if (cancelled) return;
        window.location.assign(localizedRangePath(locale, range));
      });

    return () => {
      cancelled = true;
    };
  }, [locale, messageState.locale, range]);

  useEffect(() => {
    const config = LOCALE_CONFIGS[locale];
    document.documentElement.lang = config.htmlLang;
    document.documentElement.dir = config.dir;
  }, [locale]);

  useEffect(() => {
    if (messageState.locale !== locale) return;
    document.title = messages.metadata.title;
    const tags = [
      ['meta[name="description"]', messages.metadata.description],
      ['meta[property="og:title"]', messages.metadata.title],
      ['meta[property="og:description"]', messages.metadata.ogDescription],
      ['meta[property="og:locale"]', openGraphLocale(locale)],
    ] as const;
    for (const [selector, content] of tags) {
      document.querySelector(selector)?.setAttribute("content", content);
    }
  }, [locale, messageState.locale, messages]);

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
        onLocaleChange={(next) => navigateLocale(next)}
      />
    </>
  );
};
