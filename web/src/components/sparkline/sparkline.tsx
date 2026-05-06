import type { JSX } from "react";

export interface SparklineProps {
  values: readonly number[];
  ariaLabel: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const buildPoints = (values: readonly number[], w: number, h: number): string => {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const dx = values.length === 1 ? 0 : w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * dx;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const Sparkline = ({
  values,
  ariaLabel,
  width = 100,
  height = 28,
  strokeWidth = 1.5,
}: SparklineProps): JSX.Element => {
  const points = buildPoints(values, width, height);
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      {points.length > 0 && (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      )}
    </svg>
  );
};
