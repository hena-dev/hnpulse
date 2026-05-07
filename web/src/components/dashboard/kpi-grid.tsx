import type { JSX } from "react";
import type { KpisJson, MetaJson } from "../../data/types.ts";
import { type KpiEntry, primaryKpis, secondaryKpis } from "../../lib/kpi/catalog.ts";
import { kpiSummary } from "../../lib/kpi/kpi-card.ts";
import { topDomainsForRange } from "../../lib/kpi/top-domains.ts";
import { RANGE_DAYS, type RangeId } from "../../lib/range/range.ts";
import { DualCard } from "../kpi-card/dual-card.tsx";
import { SingleCard } from "../kpi-card/single-card.tsx";
import { TopDomainCard } from "../kpi-card/top-domain-card.tsx";
import { RangeSelector } from "../range-selector/range-selector.tsx";

export interface KpiGridProps {
  kpis: KpisJson;
  meta: MetaJson;
  range: RangeId;
}

const renderCard = (entry: KpiEntry, kpis: KpisJson, days: number): JSX.Element => {
  if (entry.kind === "single") {
    const s = kpiSummary(entry.key, kpis, days);
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
    const p = kpiSummary(entry.primaryKey, kpis, days);
    const q = kpiSummary(entry.secondaryKey, kpis, days);
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
  const recent = kpis.topDomainsByDay.slice(-days);
  const top = topDomainsForRange(recent, 1)[0] ?? null;
  return <TopDomainCard key={entry.id} entry={entry} top={top} />;
};

export const KpiGrid = ({ kpis, meta, range }: KpiGridProps): JSX.Element => {
  const days = RANGE_DAYS[range];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <RangeSelector value={range} />
        <span className="text-xs text-muted-foreground">as of {meta.dataAsOf}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...primaryKpis, ...secondaryKpis].map((e) => renderCard(e, kpis, days))}
      </div>
    </div>
  );
};
