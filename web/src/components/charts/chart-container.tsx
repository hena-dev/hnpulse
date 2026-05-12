import type { JSX, ReactNode } from "react";
import { cn } from "../../lib/utils/cn.ts";

export type YScale = "linear" | "log";

export interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  scaleAriaLabel?: string;
  scaleLabels?: Readonly<Record<YScale, string>>;
  /** When provided, renders a Linear/Log toggle in the header. */
  scale?: YScale;
  onScaleChange?: (s: YScale) => void;
}

const defaultScaleLabels = {
  linear: "linear",
  log: "log",
};

const ScaleToggle = ({
  value,
  onChange,
  ariaLabel,
  labels,
}: {
  value: YScale;
  onChange: (s: YScale) => void;
  ariaLabel: string;
  labels: Readonly<Record<YScale, string>>;
}): JSX.Element => (
  <fieldset
    aria-label={ariaLabel}
    className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-wider"
  >
    {(["linear", "log"] as const).map((s) => (
      <button
        key={s}
        type="button"
        aria-pressed={value === s}
        onClick={() => onChange(s)}
        className={cn(
          "px-1.5 py-0.5 rounded border",
          value === s
            ? "bg-foreground text-background border-foreground"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {labels[s]}
      </button>
    ))}
  </fieldset>
);

export const ChartContainer = ({
  title,
  description,
  children,
  className,
  scaleAriaLabel = "Y-axis scale",
  scaleLabels = defaultScaleLabels,
  scale,
  onScaleChange,
}: ChartContainerProps): JSX.Element => (
  <section className={cn("rounded-md border bg-card p-4", className)}>
    <header className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description !== undefined && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {scale !== undefined && onScaleChange !== undefined && (
        <ScaleToggle
          value={scale}
          onChange={onScaleChange}
          ariaLabel={scaleAriaLabel}
          labels={scaleLabels}
        />
      )}
    </header>
    <div className="h-[260px] w-full">{children}</div>
  </section>
);
