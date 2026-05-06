import { RANGE_IDS, type RangeId } from "../range/range.ts";

export const DEFAULT_RANGE: RangeId = "1m";
export const STORAGE_KEY = "hnpulse.range";

const isRange = (v: string | null): v is RangeId => {
  if (v === null) return false;
  return (RANGE_IDS as readonly string[]).includes(v);
};

export const parseRangeFromUrl = (url: string): RangeId | null => {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("range");
    return isRange(v) ? v : null;
  } catch {
    return null;
  }
};

export const resolveInitialRange = (url: string, storedRange: string | null): RangeId => {
  const fromUrl = parseRangeFromUrl(url);
  if (fromUrl !== null) return fromUrl;
  if (isRange(storedRange)) return storedRange;
  return DEFAULT_RANGE;
};
