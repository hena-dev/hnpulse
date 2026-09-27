import type { JSX, ReactNode } from "react";
import { cn } from "../../lib/utils/cn.ts";

export type YScale = "linear" | "log";

export interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  legend?: ReactNode;
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
    className="inline-flex shrink-0 rounded-md border bg-card p-0.5 text-[0.625rem] font-medium"
  >
    {(["linear", "log"] as const).map((s) => (
      <button
        key={s}
        type="button"
        aria-pressed={value === s}
        onClick={() => onChange(s)}
        className={cn(
          "px-2 py-1.5 rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none",
          value === s
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
  legend,
  className,
  scaleAriaLabel = "Y-axis scale",
  scaleLabels = defaultScaleLabels,
  scale,
  onScaleChange,
}: ChartContainerProps): JSX.Element => (
  <section
    className={cn("detail-chart min-w-0 rounded-xl border bg-card p-4 shadow-sm", className)}
  >
    <header className="min-h-16 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1 basis-40">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
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
    <div className="min-h-9 flex items-center text-xs">{legend}</div>
    <div dir="ltr" className="h-[260px] w-full min-w-0 tabular-nums">
      {children}
    </div>
  </section>
);
