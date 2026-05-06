import type { JSX } from "react";
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { cn } from "../../lib/utils/cn.ts";

export interface RangeSelectorProps {
  value: RangeId;
  onChange: (next: RangeId) => void;
  className?: string;
}

export const RangeSelector = ({ value, onChange, className }: RangeSelectorProps): JSX.Element => (
  <fieldset
    aria-label="Time range"
    className={cn("inline-flex rounded-md border bg-card p-0.5", className)}
  >
    {RANGE_IDS.map((id) => {
      const isActive = id === value;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(id)}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded-sm transition-colors",
            isActive
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {id}
        </button>
      );
    })}
  </fieldset>
);
