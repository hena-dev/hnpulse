import { motion } from "@tanstack/charts/motion";

export const chartTheme = {
  foreground: "var(--foreground)",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
  background: "var(--card)",
  palette: [
    "var(--ts-chart-1)",
    "var(--ts-chart-2)",
    "var(--ts-chart-3)",
    "var(--ts-chart-4)",
    "var(--ts-chart-5)",
  ],
};

export const chartRenderer = motion({
  transition: { type: "tween", duration: 240, easing: "ease-out" },
});

export const chartAxis = {
  line: false,
  tickLabels: { fontSize: 11, thin: { minGap: 12 } },
};
