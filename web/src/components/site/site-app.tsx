import { type JSX, type MouseEvent, startTransition, useEffect, useState } from "react";
import type { MetaJson } from "../../data/types.ts";
import { useDashboardRoute } from "../../hooks/use-dashboard-route.ts";
import { useSnapshot } from "../../hooks/use-snapshot.ts";
import type { DashboardDataByRange } from "../../lib/dashboard-data.ts";
import {
  DEFAULT_RANGE,
  LOCALE_CONFIGS,
  type Locale,
  localizedRangePath,
  openGraphLocale,
} from "../../lib/i18n/config.ts";
import { loadMessages } from "../../lib/i18n/load-messages.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { RangeId } from "../../lib/range/range.ts";
import { datedPath } from "../../lib/snapshots/date.ts";
import { snapshotIntlLocale, snapshotMessages } from "../../lib/snapshots/messages.ts";
import { LanguageSwitcher } from "../language-switcher/language-switcher.tsx";
import { RangeSelector } from "../range-selector/range-selector.tsx";
import { SnapshotPending } from "../snapshot-picker/snapshot-pending.tsx";
import { SnapshotPicker } from "../snapshot-picker/snapshot-picker.tsx";
import { DashboardView } from "./dashboard-view.tsx";
import { SiteHeader } from "./site-header.tsx";

export interface SiteAppProps {
  initialRange: RangeId;
  locale: Locale;
  messages: Messages;
  ranges: DashboardDataByRange;
  meta: MetaJson;
}

export const SiteApp = ({
  initialRange,
  locale: initialLocale,
  messages: initialMessages,
  ranges,
  meta,
}: SiteAppProps): JSX.Element => {
  const route = useDashboardRoute(initialLocale, initialRange, meta.snapshots);
  const { locale, range, date, ready, navigate } = route;
  const result = useSnapshot(date, meta.snapshots);
  const [messageState, setMessageState] = useState({
    locale: initialLocale,
    messages: initialMessages,
  });
  const messages = messageState.messages;
  const copy = snapshotMessages(locale);
  const config = LOCALE_CONFIGS[locale];
  const intlLocale = date ? snapshotIntlLocale(config.intlLocale) : config.intlLocale;
  const dashboard = date ? result.data?.ranges[range] : ranges[range];
  const snapshot = date ? result.data?.snapshot : undefined;
  const displayedMeta = snapshot
    ? {
        ...meta,
        dataAsOf: snapshot.windowEnd,
        windowStart: snapshot.windowStart,
        windowEnd: snapshot.windowEnd,
        lastUpdated: snapshot.lastUpdated,
      }
    : meta;
  const hrefForRange = (next: RangeId) => datedPath(localizedRangePath(locale, next), date);
  const onRangeChange = (next: RangeId) => navigate({ locale, range: next, date });
  const onLocaleChange = (next: Locale) => navigate({ locale: next, range, date });
  const onHomeNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    navigate({ locale, range: DEFAULT_RANGE, date: null });
  };

  useEffect(() => {
    if (messageState.locale === locale) return;
    let cancelled = false;
    void loadMessages(locale)
      .then((nextMessages) => {
        if (!cancelled) startTransition(() => setMessageState({ locale, messages: nextMessages }));
      })
      /* v8 ignore next 3 -- fallback when a deployed locale chunk is unavailable. */
      .catch(() => {
        if (!cancelled) window.location.assign(datedPath(localizedRangePath(locale, range), date));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, messageState.locale, range, date]);

  useEffect(() => {
    document.documentElement.lang = config.htmlLang;
    document.documentElement.dir = config.dir;
  }, [config]);

  useEffect(() => {
    if (messageState.locale !== locale) return;
    document.title = messages.metadata.title;
    const tags = [
      ['meta[name="description"]', messages.metadata.description],
      ['meta[property="og:title"]', messages.metadata.title],
      ['meta[property="og:description"]', messages.metadata.ogDescription],
      ['meta[property="og:locale"]', openGraphLocale(locale)],
    ] as const;
    for (const [selector, content] of tags)
      document.querySelector(selector)?.setAttribute("content", content);
  }, [locale, messageState.locale, messages]);

  return (
    <>
      <SiteHeader
        homeHref={localizedRangePath(locale, DEFAULT_RANGE)}
        themeToggleLabel={messages.theme.toggle}
        onHomeNavigate={onHomeNavigate}
      />
      {meta.snapshots ? (
        <SnapshotPicker
          date={date}
          bounds={meta.snapshots}
          locale={locale}
          stabilizationDays={meta.stabilizationDays}
          status={snapshot?.status}
          onChange={(next) => navigate({ locale, range, date: next })}
        />
      ) : (
        <SnapshotPending locale={locale} />
      )}
      {dashboard ? (
        <div data-dashboard-values data-date-ready={ready ? "true" : "false"}>
          <DashboardView
            dashboard={dashboard}
            chartDashboard={dashboard}
            meta={displayedMeta}
            showAsOf={date === null}
            range={range}
            locale={locale}
            messages={messages}
            intlLocale={intlLocale}
            hrefForRange={hrefForRange}
            onRangeChange={onRangeChange}
            onLocaleChange={onLocaleChange}
          />
        </div>
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-6">
          <RangeSelector
            value={range}
            ariaLabel={messages.range.ariaLabel}
            labels={messages.range.labels}
            hrefForRange={hrefForRange}
            onRangeChange={onRangeChange}
          />
          <p role={result.error ? "alert" : "status"}>{result.error ? copy.error : copy.loading}</p>
          {result.error && (
            <button type="button" className="underline self-start" onClick={result.retry}>
              {copy.retry}
            </button>
          )}
          <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} />
        </main>
      )}
    </>
  );
};
