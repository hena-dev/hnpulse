import type { JSX } from "react";
import { classifyDelta, formatDelta } from "../../lib/format/delta.ts";
import type { SingleKpiEntry } from "../../lib/kpi/catalog.ts";
import { cn } from "../../lib/utils/cn.ts";
import { Sparkline } from "../sparkline/sparkline.tsx";
import { formatByType } from "./format-by-type.ts";

export interface SingleCardProps {
  entry: SingleKpiEntry;
  value: number;
  delta: number | null;
  sparkline: readonly number[];
}

const deltaClass = (cls: ReturnType<typeof classifyDelta>): string => {
  if (cls === "up") return "text-emerald-500 dark:text-emerald-400";
  if (cls === "down") return "text-rose-500 dark:text-rose-400";
  return "text-muted-foreground";
};

export const SingleCard = ({ entry, value, delta, sparkline }: SingleCardProps): JSX.Element => {
  const cls = delta === null ? "flat" : classifyDelta(delta);
  return (
    <article
      data-secondary={entry.secondary === true ? "true" : undefined}
      className={cn(
        "rounded-md border bg-card p-3 flex flex-col gap-1",
        entry.secondary === true && "opacity-80",
      )}
    >
      <header className="text-xs uppercase tracking-wider text-muted-foreground">
        {entry.label}
      </header>
      <div className="text-2xl font-semibold tabular-nums">{formatByType(value, entry.format)}</div>
      <div className={cn("text-xs tabular-nums", deltaClass(cls))}>
        {delta === null ? "—" : formatDelta(delta)}
      </div>
      <div className="text-muted-foreground/60">
        <Sparkline values={sparkline} ariaLabel={`${entry.label} sparkline`} />
      </div>
      <table className="sr-only">
        <caption>{entry.label}</caption>
        <tbody>
          {sparkline.map((v, i) => (
            <tr key={`${entry.id}-${String(i)}`}>
              <td>{i}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
};
