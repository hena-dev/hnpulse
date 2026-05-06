import type { TopDomainEntry, TopDomainsDay } from "../../data/types.ts";

export const topDomainsForRange = (
  daysInRange: readonly TopDomainsDay[],
  topN: number,
): TopDomainEntry[] => {
  const counts = new Map<string, number>();
  let total = 0;
  for (const day of daysInRange) {
    for (const e of day.domains) {
      counts.set(e.name, (counts.get(e.name) ?? 0) + e.stories);
      total += e.stories;
    }
  }
  const entries: TopDomainEntry[] = [];
  for (const [name, stories] of counts) {
    entries.push({ name, stories, share: total === 0 ? 0 : stories / total });
  }
  entries.sort((a, b) => b.stories - a.stories || a.name.localeCompare(b.name));
  return entries.slice(0, topN);
};
