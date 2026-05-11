import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { finished } from "node:stream/promises";
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

interface OpenNdjsonFile extends NdjsonByDayFile {
  stream: ReturnType<typeof createWriteStream>;
}

const writeLine = async (file: OpenNdjsonFile, line: string): Promise<void> => {
  if (!file.stream.write(line)) await once(file.stream, "drain");
};

export const writeNdjsonByDayFromRows = async (
  rows: Iterable<BqRow> | AsyncIterable<BqRow>,
  outDir: string,
): Promise<readonly NdjsonByDayFile[]> => {
  let directoryReady = false;
  const files = new Map<string, OpenNdjsonFile>();

  const openFile = async (day: string): Promise<OpenNdjsonFile> => {
    let file = files.get(day);
    if (file !== undefined) return file;
    if (!directoryReady) {
      await mkdir(outDir, { recursive: true });
      directoryReady = true;
    }
    const path = join(outDir, `items-${day}.ndjson`);
    file = { day, path, rows: 0, stream: createWriteStream(path, { flags: "w" }) };
    files.set(day, file);
    return file;
  };

  try {
    for await (const row of rows) {
      const day = formatUtcDay(new Date(row.timestamp));
      const file = await openFile(day);
      await writeLine(file, `${JSON.stringify(row)}\n`);
      file.rows += 1;
    }
  } catch (error) {
    for (const file of files.values()) file.stream.destroy();
    throw error;
  }

  const out = [...files.values()].sort((a, b) => a.day.localeCompare(b.day));
  await Promise.all(
    out.map(async (file) => {
      file.stream.end();
      await finished(file.stream);
    }),
  );
  return out.map(({ day, path, rows }) => ({ day, path, rows }));
};

export const writeNdjsonByDay = async (
  rows: readonly BqRow[],
  outDir: string,
): Promise<readonly NdjsonByDayFile[]> => {
  return writeNdjsonByDayFromRows(rows, outDir);
};
