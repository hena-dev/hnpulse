interface NumberFormatters {
  intFmt: Intl.NumberFormat;
  oneDpFmt: Intl.NumberFormat;
  twoDpFmt: Intl.NumberFormat;
}

const formatterCache = new Map<string, NumberFormatters>();

const getFormatters = (locale = "en-US"): NumberFormatters => {
  const cached = formatterCache.get(locale);
  if (cached !== undefined) return cached;
  const formatters = {
    intFmt: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    oneDpFmt: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    twoDpFmt: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
  formatterCache.set(locale, formatters);
  return formatters;
};

export const formatCount = (n: number, locale?: string): string => {
  const { intFmt, oneDpFmt, twoDpFmt } = getFormatters(locale);
  const abs = Math.abs(n);
  if (abs >= 100) return intFmt.format(Math.round(n));
  if (abs >= 10) return oneDpFmt.format(n);
  return twoDpFmt.format(n);
};

export const formatInteger = (n: number, locale?: string): string =>
  getFormatters(locale).intFmt.format(Math.round(n));

export const formatPercent = (fraction: number, locale?: string): string =>
  `${getFormatters(locale).oneDpFmt.format(fraction * 100)}%`;

export const formatRatio = (n: number, locale?: string): string =>
  getFormatters(locale).oneDpFmt.format(n);
