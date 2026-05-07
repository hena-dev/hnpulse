import type { CSSProperties, JSX } from "react";
import { Tooltip } from "recharts";

const contentStyle: CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.375rem",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.15)",
};

const labelStyle: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 500,
};

const itemStyle: CSSProperties = {
  color: "var(--popover-foreground)",
};

const cursor = {
  fill: "var(--muted)",
  fillOpacity: 0.4,
  stroke: "var(--muted-foreground)",
  strokeOpacity: 0.4,
};

/**
 * Recharts <Tooltip /> pre-styled with the app's theme tokens so the popup
 * respects light/dark mode (background, border, text, hover cursor).
 */
export const ChartTooltip = (): JSX.Element => (
  <Tooltip
    contentStyle={contentStyle}
    labelStyle={labelStyle}
    itemStyle={itemStyle}
    cursor={cursor}
  />
);
