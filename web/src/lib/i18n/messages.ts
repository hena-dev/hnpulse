import type { RangeId } from "../range/range.ts";
import type { Locale } from "./config.ts";
import arMessages from "./messages/ar.json";
import deMessages from "./messages/de.json";
import enMessages from "./messages/en.json";
import esMessages from "./messages/es.json";
import faMessages from "./messages/fa.json";
import frMessages from "./messages/fr.json";
import hiMessages from "./messages/hi.json";
import idMessages from "./messages/id.json";
import itMessages from "./messages/it.json";
import jaMessages from "./messages/ja.json";
import koMessages from "./messages/ko.json";
import nlMessages from "./messages/nl.json";
import plMessages from "./messages/pl.json";
import ptMessages from "./messages/pt.json";
import ruMessages from "./messages/ru.json";
import thMessages from "./messages/th.json";
import trMessages from "./messages/tr.json";
import ukMessages from "./messages/uk.json";
import viMessages from "./messages/vi.json";
import zhMessages from "./messages/zh.json";
import zhTwMessages from "./messages/zh-tw.json";

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
    labels: Record<RangeId, string>;
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

export const messages = {
  en: enMessages,
  zh: zhMessages,
  es: esMessages,
  hi: hiMessages,
  ar: arMessages,
  pt: ptMessages,
  id: idMessages,
  ja: jaMessages,
  ru: ruMessages,
  fr: frMessages,
  de: deMessages,
  ko: koMessages,
  tr: trMessages,
  vi: viMessages,
  it: itMessages,
  pl: plMessages,
  nl: nlMessages,
  th: thMessages,
  fa: faMessages,
  uk: ukMessages,
  "zh-tw": zhTwMessages,
} satisfies Record<Locale, Messages>;

export const getMessages = (locale: Locale): Messages => messages[locale];

export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{([a-z]+)\}/g, (match, key: string) => String(values[key] ?? match));
