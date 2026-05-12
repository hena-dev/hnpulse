const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale = "en-US"): Intl.NumberFormat => {
  const cached = formatterCache.get(locale);
  if (cached !== undefined) return cached;
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  formatterCache.set(locale, formatter);
  return formatter;
};

export type DeltaClass = "up" | "down" | "flat";

export const formatDelta = (delta: number, locale?: string): string => {
  if (Number.isNaN(delta)) return "—";
  if (!Number.isFinite(delta)) return delta > 0 ? "+∞" : "−∞";
  if (delta === 0) return "0.0%";
  const abs = Math.abs(delta) * 100;
  const sign = delta > 0 ? "+" : "−";
  const arrow = delta > 0 ? "▲" : "▼";
  return `${sign}${getFormatter(locale).format(abs)}% ${arrow}`;
};

export const classifyDelta = (delta: number): DeltaClass => {
  if (Number.isNaN(delta) || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
};
