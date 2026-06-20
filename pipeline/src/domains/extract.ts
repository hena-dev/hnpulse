import { getDomain } from "tldts";
import type { TopDomainEntry } from "../schema/kpis.ts";

const WWW_PREFIX = /^www\./;

/**
 * Returns the registrable domain (eTLD+1) for the given URL, lowercased and
 * with leading `www.` stripped.  Returns null when the URL is missing,
 * malformed, or has no recognised public-suffix-based host (e.g. localhost,
 * raw IP addresses).
 */
export const extractRegistrableDomain = (url: string | null | undefined): string | null => {
  if (typeof url !== "string" || url.length === 0) return null;
  const domain = getDomain(url, { allowPrivateDomains: false });
  if (domain === null || domain.length === 0) return null;
  return domain.toLowerCase().replace(WWW_PREFIX, "");
};

/**
 * Given a `Map<domain, storyCount>`, the total story count with a recognised
 * registrable domain, and a top-N limit, returns the top-N entries sorted
 * descending by story count. Share is normalised over recognised-domain story
 * links, not over all stories.
 */
export const computeDomainShares = (
  counts: ReadonlyMap<string, number>,
  total: number,
  topN: number,
): TopDomainEntry[] => {
  const entries: TopDomainEntry[] = [];
  for (const [name, stories] of counts) {
    const share = total > 0 ? stories / total : 0;
    entries.push({ name, stories, share });
  }
  entries.sort((a, b) => b.stories - a.stories || a.name.localeCompare(b.name));
  return entries.slice(0, topN);
};
