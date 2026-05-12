const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

const parseUtcDate = (value: string): Date | null => {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateFormatter = (locale = "en-US"): Intl.DateTimeFormat => {
  const cached = dateFormatterCache.get(locale);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  dateFormatterCache.set(locale, formatter);
  return formatter;
};

const dateTimeFormatter = (locale = "en-US"): Intl.DateTimeFormat => {
  const cached = dateTimeFormatterCache.get(locale);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  dateTimeFormatterCache.set(locale, formatter);
  return formatter;
};

export const formatDateOnly = (value: string, locale?: string): string => {
  const date = parseUtcDate(value);
  return date === null ? value : dateFormatter(locale).format(date);
};

export const formatDateTime = (value: string, locale?: string): string => {
  const date = parseUtcDate(value);
  return date === null ? value : dateTimeFormatter(locale).format(date);
};
