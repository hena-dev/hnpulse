import type { JSX } from "react";
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { cn } from "../../lib/utils/cn.ts";

export interface RangeSelectorProps {
  value: RangeId;
  className?: string;
}

export const RangeSelector = ({ value, className }: RangeSelectorProps): JSX.Element => (
  <nav
    aria-label="Time range"
    className={cn("inline-flex rounded-md border bg-card p-0.5", className)}
  >
    {RANGE_IDS.map((id) => {
      const isActive = id === value;
      return (
        <a
          key={id}
          href={`/${id}`}
          data-astro-prefetch="load"
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded-sm transition-colors",
            isActive
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {id}
        </a>
      );
    })}
  </nav>
);
