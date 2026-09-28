import { useEffect, useState } from "react";
import type { LoadedSnapshot } from "../data/snapshot.ts";
import type { SnapshotBounds } from "../data/types.ts";

export const useSnapshot = (date: string | null, bounds?: SnapshotBounds) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: LoadedSnapshot;
    error?: boolean;
  }>();
  const key = `${date}/${bounds?.finalThrough}/${attempt}`;
  // Reset during render so returning to a mutable date never flashes an old response.
  if (state?.key !== key) setState({ key });
  useEffect(() => {
    if (!date || !bounds) return;
    let cancelled = false;
    void import("../data/snapshot.ts")
      .then(({ loadSnapshot }) => loadSnapshot(date, bounds))
      .then((data) => {
        if (!cancelled) setState({ key, data });
      })
      .catch(() => {
        if (!cancelled) setState({ key, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [date, bounds, key]);
  return {
    data: state?.key === key ? state.data : undefined,
    error: state?.key === key && state.error === true,
    retry: () => setAttempt((value) => value + 1),
  };
};
