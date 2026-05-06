export const ordersOfMagnitude = (values: readonly number[]): number => {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const v of values) {
    if (!Number.isFinite(v) || v <= 0) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === 0 || !Number.isFinite(min)) return 0;
  return Math.log10(max / min);
};

/**
 * §4.5 — show a log-scale toggle only when the data spans STRICTLY more
 * than two orders of magnitude in the selected range.
 */
export const shouldOfferLogScale = (values: readonly number[]): boolean =>
  ordersOfMagnitude(values) > 2;
