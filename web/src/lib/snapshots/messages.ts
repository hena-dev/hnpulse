import type { Locale } from "../i18n/config.ts";
import copy from "./messages.json";

export const snapshotMessages = (locale: Locale) => {
  const [date, latest, provisional, estimate, loading, error, retry, month, year, previous, next] =
    copy[locale] as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
  return {
    date,
    latest,
    provisional,
    estimate,
    loading,
    error,
    retry,
    month,
    year,
    previous,
    next,
  };
};

// The picker uses Gregorian months; explicitly match its year in Thai and Persian labels too.
export const snapshotIntlLocale = (locale: string): string => `${locale}-u-ca-gregory`;
