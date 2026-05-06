export const METRIC_KEYS = [
  "stories",
  "comments",
  "activeCommenters",
  "activeSubmitters",
  "medianScore",
  "p90Score",
  "commentsPerStory",
  "successRateGte100",
  "showHn",
  "askHn",
  "jobs",
  "deadFlaggedRatio",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricSeries = Readonly<Record<MetricKey, readonly number[]>>;

export interface TopDomainEntry {
  name: string;
  stories: number;
  share: number;
}

export interface TopDomainsDay {
  date: string;
  domains: readonly TopDomainEntry[];
}

export interface KpisJson {
  schemaVersion: 1;
  windowStart: string;
  windowEnd: string;
  days: readonly string[];
  metrics: MetricSeries;
  topDomainsByDay: readonly TopDomainsDay[];
}

export interface MetaJson {
  schemaVersion: 1;
  lastUpdated: string;
  dataAsOf: string;
  windowStart: string;
  windowEnd: string;
  kpisFile: string;
  buildSha: string;
  pipelineVersion: string;
}
