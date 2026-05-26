import type { JSX } from "react";
import type { MetaJson, TopDomainEntry } from "../../data/types.ts";
import type { KpiSummaries } from "../../lib/dashboard-data.ts";
import { formatDateOnly } from "../../lib/format/date.ts";
import { formatMessage } from "../../lib/i18n/format-message.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import { type KpiEntry, primaryKpis, secondaryKpis } from "../../lib/kpi/catalog.ts";
import type { RangeId } from "../../lib/range/range.ts";
import { DualCard } from "../kpi-card/dual-card.tsx";
import { SingleCard } from "../kpi-card/single-card.tsx";
import { TopDomainCard } from "../kpi-card/top-domain-card.tsx";
import { RangeSelector } from "../range-selector/range-selector.tsx";

export interface KpiGridProps {
  summaries: KpiSummaries;
  meta: MetaJson;
  range: RangeId;
  topDomain: TopDomainEntry | null;
  messages: Messages;
  intlLocale: string;
  hrefForRange: (range: RangeId) => string;
  onRangeChange?: (range: RangeId) => void;
}

const localizeEntry = (entry: KpiEntry, messages: Messages): KpiEntry => {
  const copy = messages.kpis[entry.id];
  if (entry.kind !== "dual") return { ...entry, label: copy.label, description: copy.description };
  return {
    ...entry,
    label: copy.label,
    description: copy.description,
    primaryLabel: copy.primaryLabel ?? entry.primaryLabel,
    secondaryLabel: copy.secondaryLabel ?? entry.secondaryLabel,
  };
};

const renderCard = (
  entry: KpiEntry,
  summaries: KpiSummaries,
  topDomain: TopDomainEntry | null,
  messages: Messages,
  intlLocale: string,
): JSX.Element => {
  if (entry.kind === "single") {
    const s = summaries[entry.key];
    const localizedEntry = localizeEntry(entry, messages) as typeof entry;
    return (
      <SingleCard
        key={entry.id}
        entry={localizedEntry}
        value={s.value}
        delta={s.delta}
        sparkline={s.sparkline}
        intlLocale={intlLocale}
        sparklineLabel={messages.sparkline}
      />
    );
  }
  if (entry.kind === "dual") {
    const p = summaries[entry.primaryKey];
    const q = summaries[entry.secondaryKey];
    const localizedEntry = localizeEntry(entry, messages) as typeof entry;
    return (
      <DualCard
        key={entry.id}
        entry={localizedEntry}
        primaryValue={p.value}
        secondaryValue={q.value}
        primaryDelta={p.delta}
        primarySparkline={p.sparkline}
        secondarySparkline={q.sparkline}
        intlLocale={intlLocale}
        sparklineLabel={messages.sparkline}
      />
    );
  }
  const localizedEntry = localizeEntry(entry, messages) as typeof entry;
  return (
    <TopDomainCard
      key={entry.id}
      entry={localizedEntry}
      top={topDomain}
      intlLocale={intlLocale}
      messages={messages.topDomain}
    />
  );
};

export const KpiGrid = ({
  summaries,
  meta,
  range,
  topDomain,
  messages,
  intlLocale,
  hrefForRange,
  onRangeChange,
}: KpiGridProps): JSX.Element => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <RangeSelector
        value={range}
        ariaLabel={messages.range.ariaLabel}
        labels={messages.range.labels}
        hrefForRange={hrefForRange}
        {...(onRangeChange === undefined ? {} : { onRangeChange })}
      />
      <span className="text-xs text-muted-foreground">
        {formatMessage(messages.dashboard.asOf, {
          date: formatDateOnly(meta.dataAsOf, intlLocale),
        })}
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[...primaryKpis, ...secondaryKpis].map((e) =>
        renderCard(e, summaries, topDomain, messages, intlLocale),
      )}
    </div>
  </div>
);
