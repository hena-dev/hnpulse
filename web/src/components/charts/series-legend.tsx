import type { JSX } from "react";
import { cn } from "../../lib/utils/cn.ts";

interface SeriesLegendProps {
  names: readonly [string, string];
  visible: readonly [boolean, boolean];
  onToggle?: (index: number) => void;
}

export const SeriesLegend = ({ names, visible, onToggle }: SeriesLegendProps): JSX.Element => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
    {names.map((name, index) => {
      const label = (
        <>
          <span
            aria-hidden="true"
            className={cn("w-4 border-t-2", index === 1 && onToggle && "border-dashed")}
            style={{ borderColor: `var(--chart-${index + 1})` }}
          />
          <span>{name}</span>
        </>
      );
      return onToggle ? (
        <button
          key={name}
          type="button"
          aria-pressed={visible[index]}
          aria-disabled={visible[index] && visible.filter(Boolean).length === 1}
          onClick={() => onToggle(index)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm py-1 text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none",
            !visible[index] && "opacity-40",
          )}
        >
          {label}
        </button>
      ) : (
        <span key={name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {label}
        </span>
      );
    })}
  </div>
);
