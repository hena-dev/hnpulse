import type { DomainRow } from "../aggregate/assemble.ts";
import { computeDomainShares, extractRegistrableDomain } from "../domains/extract.ts";
import type { TopDomainsByRange } from "../schema/kpis.ts";
import { RANGE_DAYS, RANGE_IDS } from "../schema/range.ts";

export const countDomains = (
  days: readonly string[],
  rows: readonly DomainRow[],
): Map<string, number>[] => {
  const byDay = new Map(days.map((day) => [day, new Map<string, number>()]));
  for (const row of rows) {
    const counts = byDay.get(row.day);
    if (counts === undefined) continue;
    const domain = extractRegistrableDomain(row.url);
    if (domain !== null) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...byDay.values()];
};

const updateCounts = (
  state: { counts: Map<string, number>; total: number },
  day: ReadonlyMap<string, number> | undefined,
  sign: number,
): void => {
  for (const [domain, count] of day ?? []) {
    const next = (state.counts.get(domain) ?? 0) + sign * count;
    if (next === 0) state.counts.delete(domain);
    else state.counts.set(domain, next);
    state.total += sign * count;
  }
};

/** Keep every domain in the rolling state; truncate only the emitted rankings. */
export const slidingDomains = (
  daily: readonly ReadonlyMap<string, number>[],
  windowDays: number,
) => {
  const states = RANGE_IDS.map((id) => ({ id, counts: new Map<string, number>(), total: 0 }));
  let cursor = -1;
  const move = (index: number): TopDomainsByRange => {
    if (index <= cursor) throw new Error("Domain windows must advance monotonically");
    for (; cursor < index; ) {
      cursor += 1;
      for (const state of states) {
        const length = Math.min(windowDays, RANGE_DAYS[state.id]);
        updateCounts(state, daily[cursor], 1);
        updateCounts(state, daily[cursor - length], -1);
      }
    }
    return Object.fromEntries(
      states.map(({ id, counts, total }) => [id, computeDomainShares(counts, total, 10)]),
    ) as TopDomainsByRange;
  };
  return move;
};
