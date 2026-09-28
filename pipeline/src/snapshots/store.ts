import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ARCHIVE_START } from "../release/archive.ts";
import { SnapshotJsonSchema } from "../schema/snapshot.ts";
import { daysBetween, offsetDay } from "./dates.ts";
import { comparisonHistoryStart, snapshotWindowStart } from "./history.ts";

export const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const provisionalDays = async (dataDir: string): Promise<string[]> => {
  try {
    return (await readdir(join(dataDir, "provisional")))
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map((name) => name.slice(0, 10));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

export const verifyFinal = (
  text: string,
  day: string,
  windowDays: number,
  archiveFirst = ARCHIVE_START,
): void => {
  const snapshot = SnapshotJsonSchema.parse(JSON.parse(text));
  if (
    snapshot.status !== "final" ||
    snapshot.windowEnd !== day ||
    snapshot.windowStart !==
      snapshotWindowStart(snapshot.schemaVersion, day, windowDays, archiveFirst)
  ) {
    throw new Error(`Invalid existing final snapshot: ${day}`);
  }
};

export interface SnapshotPlan {
  archiveFirst: string;
  first: string;
  last: string;
  finalThrough: string;
  existing: Map<string, string>;
  pending: string[];
  aggregateStart: string;
  refreshFrom: string;
}

const previousRefreshFrom = async (
  dataDir: string,
  last: string,
  boundary: string,
): Promise<string> => {
  const candidates = [boundary, ...(await provisionalDays(dataDir))];
  const previous = await readOptional(join(dataDir, "meta.json"));
  if (previous !== undefined) {
    const { provisionalFrom, snapshots } = JSON.parse(previous);
    if (snapshots !== undefined && (snapshots.last > last || snapshots.finalThrough > boundary)) {
      throw new Error("Snapshot last/finalThrough cannot move backward");
    }
    if (typeof provisionalFrom === "string") candidates.push(provisionalFrom);
  }
  for (const day of candidates) offsetDay(day, 0);
  return candidates.sort()[0] as string;
};

export const planSnapshots = async (args: {
  dataDir: string;
  first: string;
  last: string;
  windowDays: number;
  stabilizationDays: number;
  archiveFirst?: string;
}): Promise<SnapshotPlan> => {
  const { first, last, windowDays, dataDir } = args;
  const archiveFirst = args.archiveFirst ?? ARCHIVE_START;
  offsetDay(archiveFirst, 0);
  offsetDay(first, 0);
  if (
    first > last ||
    !Number.isInteger(windowDays) ||
    windowDays < 1 ||
    !Number.isInteger(args.stabilizationDays) ||
    args.stabilizationDays < 1
  ) {
    throw new Error("Invalid snapshot range/window configuration");
  }
  if (archiveFirst > offsetDay(first, 1 - windowDays)) {
    throw new Error("Archive must cover the entire selected snapshot window");
  }
  const finalThrough = offsetDay(last, -args.stabilizationDays);
  let refreshFrom = await previousRefreshFrom(dataDir, last, finalThrough);
  const existing = new Map<string, string>();
  const pending: string[] = [];
  for (const day of daysBetween(first, last)) {
    const path = join(dataDir, "snapshots", `${day}.json`);
    const text = await readOptional(path);
    if (text !== undefined) {
      verifyFinal(text, day, windowDays, archiveFirst);
      if (day > finalThrough) throw new Error(`Final snapshot inside provisional window: ${day}`);
      existing.set(day, path);
    } else pending.push(day);
  }
  if (existing.size > 0 && pending[0] !== undefined && pending[0] < refreshFrom) {
    refreshFrom = pending[0];
  }
  return {
    archiveFirst,
    first,
    last,
    finalThrough,
    existing,
    pending,
    refreshFrom,
    aggregateStart: comparisonHistoryStart(pending[0] ?? last, windowDays, archiveFirst),
  };
};
