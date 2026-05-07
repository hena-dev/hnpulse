import type { JSX } from "react";
import type { MetaJson, TopDomainEntry } from "../../data/types.ts";
import type { KpiSummaries } from "../../lib/dashboard-data.ts";
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
}

const renderCard = (
  entry: KpiEntry,
  summaries: KpiSummaries,
  topDomain: TopDomainEntry | null,
): JSX.Element => {
  if (entry.kind === "single") {
    const s = summaries[entry.key];
    return (
      <SingleCard
        key={entry.id}
        entry={entry}
        value={s.value}
        delta={s.delta}
        sparkline={s.sparkline}
      />
    );
  }
  if (entry.kind === "dual") {
    const p = summaries[entry.primaryKey];
    const q = summaries[entry.secondaryKey];
    return (
      <DualCard
        key={entry.id}
        entry={entry}
        primaryValue={p.value}
        secondaryValue={q.value}
        primaryDelta={p.delta}
        primarySparkline={p.sparkline}
        secondarySparkline={q.sparkline}
      />
    );
  }
  return <TopDomainCard key={entry.id} entry={entry} top={topDomain} />;
};

export const KpiGrid = ({ summaries, meta, range, topDomain }: KpiGridProps): JSX.Element => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <RangeSelector value={range} />
      <span className="text-xs text-muted-foreground">as of {meta.dataAsOf}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[...primaryKpis, ...secondaryKpis].map((e) => renderCard(e, summaries, topDomain))}
    </div>
  </div>
);
