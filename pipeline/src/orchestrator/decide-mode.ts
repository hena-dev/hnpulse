import { parseUtcDay } from "../dates/utc-day.ts";
import { parseParquetAssetDate, pickParquetAssets, type ReleaseAsset } from "../release/index.ts";

export type ModeDecision =
  | {
      mode: "bootstrap";
      existingDays: readonly string[];
    }
  | {
      mode: "incremental";
      /** The most recent UTC day already covered by parquet. */
      lastMaxTs: Date;
      /** Existing parquet asset names recognised in the release. */
      existingDays: readonly string[];
    };

const sortedDays = (assets: readonly ReleaseAsset[]): string[] => {
  // pickParquetAssets pre-filters by name shape *and* calendar validity, so
  // every result has a non-null date.
  const parquets = pickParquetAssets(assets);
  return parquets.map((a) => parseParquetAssetDate(a.name) as string).sort();
};

export const decideMode = (assets: readonly ReleaseAsset[]): ModeDecision => {
  const days = sortedDays(assets);
  if (days.length === 0) return { mode: "bootstrap", existingDays: [] };
  // "last" is guaranteed by the length check above.
  const last = days[days.length - 1] as string;
  // The last parquet covers a full UTC day; the next incremental extract starts
  // immediately after this timestamp.
  const endOfLast = new Date(parseUtcDay(last).getTime() + 86_400_000 - 1);
  return { mode: "incremental", lastMaxTs: endOfLast, existingDays: days };
};
