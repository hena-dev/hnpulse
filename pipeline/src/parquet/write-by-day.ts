import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatUtcDay } from "../dates/utc-day.ts";
import type { BqRow } from "../schema/bq-row.ts";

export const groupRowsByUtcDay = (
  rows: readonly BqRow[],
): ReadonlyMap<string, readonly BqRow[]> => {
  const out = new Map<string, BqRow[]>();
  for (const r of rows) {
    const day = formatUtcDay(new Date(r.timestamp));
    let bucket = out.get(day);
    if (bucket === undefined) {
      bucket = [];
      out.set(day, bucket);
    }
    bucket.push(r);
  }
  return out;
};

export interface NdjsonByDayFile {
  day: string;
  path: string;
  rows: number;
}

export const writeNdjsonByDay = async (
  rows: readonly BqRow[],
  outDir: string,
): Promise<readonly NdjsonByDayFile[]> => {
  if (rows.length === 0) return [];
  await mkdir(outDir, { recursive: true });
  const grouped = groupRowsByUtcDay(rows);
  const out: NdjsonByDayFile[] = [];
  for (const [day, bucket] of grouped) {
    const path = join(outDir, `items-${day}.ndjson`);
    const ndjson = bucket.map((r) => JSON.stringify(r)).join("\n");
    await writeFile(path, `${ndjson}\n`, "utf8");
    out.push({ day, path, rows: bucket.length });
  }
  return out;
};
