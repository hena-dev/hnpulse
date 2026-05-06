const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDpFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDpFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCount = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 100) return intFmt.format(Math.round(n));
  if (abs >= 10) return oneDpFmt.format(n);
  return twoDpFmt.format(n);
};

export const formatPercent = (fraction: number): string => `${oneDpFmt.format(fraction * 100)}%`;

export const formatRatio = (n: number): string => oneDpFmt.format(n);
