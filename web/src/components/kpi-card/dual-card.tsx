import type { JSX } from "react";
import { classifyDelta, formatDelta } from "../../lib/format/delta.ts";
import type { DualKpiEntry } from "../../lib/kpi/catalog.ts";
import { cn } from "../../lib/utils/cn.ts";
import { Sparkline } from "../sparkline/sparkline.tsx";
import { formatByType } from "./format-by-type.ts";

export interface DualCardProps {
  entry: DualKpiEntry;
  primaryValue: number;
  secondaryValue: number;
  primaryDelta: number | null;
  primarySparkline: readonly number[];
  secondarySparkline: readonly number[];
}

const deltaClass = (cls: ReturnType<typeof classifyDelta>): string => {
  if (cls === "up") return "text-emerald-500 dark:text-emerald-300";
  if (cls === "down") return "text-rose-500 dark:text-rose-300";
  return "text-muted-foreground";
};

export const DualCard = ({
  entry,
  primaryValue,
  secondaryValue,
  primaryDelta,
  primarySparkline,
  secondarySparkline,
}: DualCardProps): JSX.Element => {
  const cls = primaryDelta === null ? "flat" : classifyDelta(primaryDelta);
  return (
    <article className="rounded-md border bg-card p-3 flex flex-col gap-1">
      <header className="text-xs uppercase tracking-wider text-muted-foreground">
        {entry.label}
      </header>
      <div className="flex items-baseline gap-3 tabular-nums">
        <div>
          <div className="text-2xl font-semibold">{formatByType(primaryValue, entry.format)}</div>
          <div className="text-[0.625rem] text-muted-foreground uppercase">
            {entry.primaryLabel}
          </div>
        </div>
        <div className="text-muted-foreground">/</div>
        <div>
          <div className="text-xl font-semibold">{formatByType(secondaryValue, entry.format)}</div>
          <div className="text-[0.625rem] text-muted-foreground uppercase">
            {entry.secondaryLabel}
          </div>
        </div>
      </div>
      <div className={cn("text-xs tabular-nums", deltaClass(cls))}>
        {primaryDelta === null ? "—" : formatDelta(primaryDelta)}
      </div>
      <div className="text-muted-foreground/60 grid grid-cols-2 gap-1">
        <Sparkline values={primarySparkline} ariaLabel={`${entry.primaryLabel} sparkline`} />
        <Sparkline values={secondarySparkline} ariaLabel={`${entry.secondaryLabel} sparkline`} />
      </div>
    </article>
  );
};
