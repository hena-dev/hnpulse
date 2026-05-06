/**
 * Period-over-period delta — §5.5.
 *   - previous > 0:    (current - previous) / previous
 *   - previous == 0,
 *      current > 0:    +Infinity
 *      current <= 0:   0
 *   - NaN current:     NaN
 */
export const computeDelta = (current: number, previous: number): number => {
  if (Number.isNaN(current)) return Number.NaN;
  if (previous === 0) return current > 0 ? Number.POSITIVE_INFINITY : 0;
  return (current - previous) / previous;
};
