/**
 * \u00a713.1 \u2014 Date coverage check.
 * HN never has zero-story days, so any 0/missing entry indicates ingestion loss.
 * Returns the list of UTC day strings that fail the check.
 */
const isEmpty = (v: number | undefined): boolean =>
  v === undefined || !Number.isFinite(v) || v <= 0;

export const findEmptyDays = (
  days: readonly string[],
  storiesSeries: readonly number[],
): readonly string[] => {
  if (days.length !== storiesSeries.length) {
    throw new Error(`length mismatch: days=${days.length} stories=${storiesSeries.length}`);
  }
  const out: string[] = [];
  for (let i = 0; i < days.length; i += 1) {
    if (isEmpty(storiesSeries[i])) out.push(days[i] as string);
  }
  return out;
};
