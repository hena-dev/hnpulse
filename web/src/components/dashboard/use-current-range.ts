import { useEffect, useState } from "react";
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { resolveInitialRange, STORAGE_KEY } from "../../lib/url-state/range.ts";

export const RANGE_CHANGE_EVENT = "hnpulse:range-change";

const isRangeId = (v: unknown): v is RangeId =>
  typeof v === "string" && (RANGE_IDS as readonly string[]).includes(v);

const initRange = (): RangeId => {
  if (typeof window === "undefined") return "1m";
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return resolveInitialRange(window.location.href, stored);
};

/**
 * Subscribes to the cross-island range-change protocol. Returns the current
 * range and a setter that broadcasts to every other island on the page.
 */
export const useCurrentRange = (): [RangeId, (next: RangeId) => void] => {
  const [range, setRange] = useState<RangeId>(initRange);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (ev: Event): void => {
      const detail = (ev as CustomEvent<RangeId>).detail;
      if (isRangeId(detail) && detail !== range) setRange(detail);
    };
    window.addEventListener(RANGE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(RANGE_CHANGE_EVENT, handler);
  }, [range]);

  const broadcast = (next: RangeId): void => {
    setRange(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    url.searchParams.set("range", next);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new CustomEvent<RangeId>(RANGE_CHANGE_EVENT, { detail: next }));
  };

  return [range, broadcast];
};
