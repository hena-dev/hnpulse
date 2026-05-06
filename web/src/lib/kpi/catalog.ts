import type { MetricKey } from "../../data/types.ts";

export type KpiFormat = "count" | "ratio" | "percent";

interface BaseEntry {
  id: string;
  label: string;
  description: string;
  /** True for the small/secondary card row (Dead/flagged ratio). */
  secondary?: boolean;
}

export interface SingleKpiEntry extends BaseEntry {
  kind: "single";
  key: MetricKey;
  format: KpiFormat;
}

export interface DualKpiEntry extends BaseEntry {
  kind: "dual";
  primaryKey: MetricKey;
  secondaryKey: MetricKey;
  primaryLabel: string;
  secondaryLabel: string;
  format: KpiFormat;
}

export interface TopDomainKpiEntry extends BaseEntry {
  kind: "topDomain";
}

export type KpiEntry = SingleKpiEntry | DualKpiEntry | TopDomainKpiEntry;

export const KPI_CATALOG: readonly KpiEntry[] = [
  {
    id: "stories",
    kind: "single",
    key: "stories",
    label: "Stories / day",
    description: "Avg. story submissions per UTC day",
    format: "count",
  },
  {
    id: "comments",
    kind: "single",
    key: "comments",
    label: "Comments / day",
    description: "Avg. comments per UTC day",
    format: "count",
  },
  {
    id: "activeCommenters",
    kind: "single",
    key: "activeCommenters",
    label: "Active commenters",
    description: "Distinct comment authors / day",
    format: "count",
  },
  {
    id: "activeSubmitters",
    kind: "single",
    key: "activeSubmitters",
    label: "Active submitters",
    description: "Distinct story authors / day",
    format: "count",
  },
  {
    id: "score",
    kind: "dual",
    primaryKey: "medianScore",
    secondaryKey: "p90Score",
    label: "Story score",
    description: "Median (p50) and p90 of daily story scores",
    primaryLabel: "median",
    secondaryLabel: "p90",
    format: "count",
  },
  {
    id: "commentsPerStory",
    kind: "single",
    key: "commentsPerStory",
    label: "Comments / story",
    description: "Engagement ratio",
    format: "ratio",
  },
  {
    id: "successRateGte100",
    kind: "single",
    key: "successRateGte100",
    label: "Success rate (≥100)",
    description: "Stories scoring ≥100 / all stories",
    format: "percent",
  },
  {
    id: "topDomain",
    kind: "topDomain",
    label: "Top domain",
    description: "Most-submitted registrable domain in the selected range",
  },
  {
    id: "showHn",
    kind: "single",
    key: "showHn",
    label: "Show HN / day",
    description: "Show HN posts / day",
    format: "count",
  },
  {
    id: "askHn",
    kind: "single",
    key: "askHn",
    label: "Ask HN / day",
    description: "Ask HN posts / day",
    format: "count",
  },
  {
    id: "jobs",
    kind: "single",
    key: "jobs",
    label: "Jobs / day",
    description: "Job postings / day",
    format: "count",
  },
  {
    id: "deadFlaggedRatio",
    kind: "single",
    key: "deadFlaggedRatio",
    label: "Dead/flagged",
    description: "Share of items flagged dead",
    format: "percent",
    secondary: true,
  },
];

export const primaryKpis: readonly KpiEntry[] = KPI_CATALOG.filter((k) => k.secondary !== true);
export const secondaryKpis: readonly KpiEntry[] = KPI_CATALOG.filter((k) => k.secondary === true);
