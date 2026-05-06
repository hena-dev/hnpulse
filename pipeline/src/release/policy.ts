import { parseUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import type { ReleaseAsset } from "./types.ts";

const MS_PER_DAY = 86_400_000;

export const PARQUET_NAME_RE = /^items-(\d{4}-\d{2}-\d{2})\.parquet$/;

export const parseParquetAssetDate = (name: string): string | null => {
  const m = PARQUET_NAME_RE.exec(name);
  if (m === null) return null;
  const day = m[1];
  if (day === undefined) return null;
  try {
    parseUtcDay(day);
    return day;
  } catch {
    return null;
  }
};

export const pickParquetAssets = (assets: readonly ReleaseAsset[]): readonly ReleaseAsset[] =>
  assets.filter((a) => parseParquetAssetDate(a.name) !== null);

export const pickAssetsToDelete = (
  assets: readonly ReleaseAsset[],
  today: Date,
  retentionDays: number,
): readonly string[] => {
  const cutoff = startOfUtcDay(today).getTime() - retentionDays * MS_PER_DAY;
  const out: string[] = [];
  for (const a of assets) {
    const day = parseParquetAssetDate(a.name);
    if (day === null) continue;
    if (parseUtcDay(day).getTime() < cutoff) out.push(a.name);
  }
  return out;
};
