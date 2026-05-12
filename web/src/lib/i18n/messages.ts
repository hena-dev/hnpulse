import type { Locale } from "./config.ts";
import rawMessages from "./messages.json";

export interface MetadataMessages {
  title: string;
  description: string;
  ogDescription: string;
  dataFeedTitle: string;
}

export interface KpiMessages {
  label: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export type KpiMessageId =
  | "stories"
  | "comments"
  | "activeCommenters"
  | "activeSubmitters"
  | "score"
  | "commentsPerStory"
  | "successRateGte100"
  | "topDomain"
  | "showHn"
  | "askHn"
  | "jobs"
  | "deadFlaggedRatio";

export interface Messages {
  metadata: MetadataMessages;
  redirect: {
    message: string;
    fallback: string;
  };
  range: {
    ariaLabel: string;
  };
  theme: {
    toggle: string;
  };
  dashboard: {
    asOf: string;
    footerBuiltBy: string;
    footerRepo: string;
    lastUpdated: string;
  };
  charts: {
    unavailable: string;
    scaleAria: string;
    scaleLinear: string;
    scaleLog: string;
    storiesVsCommentsTitle: string;
    storiesVsCommentsDescription: string;
    activeUsersTitle: string;
    activeUsersDescription: string;
    topDomainsTitle: string;
    topDomainsDescription: string;
    scoreTrendTitle: string;
    scoreTrendDescription: string;
    seriesStories: string;
    seriesComments: string;
    seriesCommenters: string;
    seriesSubmitters: string;
    seriesMedian: string;
    seriesP90: string;
  };
  topDomain: {
    ofStories: string;
    submissions: string;
  };
  sparkline: string;
  kpis: Record<KpiMessageId, KpiMessages>;
}

export const messages = rawMessages as Record<Locale, Messages>;

export const getMessages = (locale: Locale): Messages => messages[locale];

export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{([a-z]+)\}/g, (match, key: string) => String(values[key] ?? match));
