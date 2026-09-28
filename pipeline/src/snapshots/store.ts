import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { SnapshotJsonSchema } from "../schema/snapshot.ts";
import { daysBetween, offsetDay } from "./dates.ts";

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

export const verifyFinal = (text: string, day: string, windowDays: number): void => {
  const snapshot = SnapshotJsonSchema.parse(JSON.parse(text));
  if (
    snapshot.status !== "final" ||
    snapshot.windowEnd !== day ||
    snapshot.windowStart !== offsetDay(day, 1 - windowDays)
  ) {
    throw new Error(`Invalid existing final snapshot: ${day}`);
  }
};

export interface SnapshotPlan {
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
}): Promise<SnapshotPlan> => {
  const { first, last, windowDays, dataDir } = args;
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
  const finalThrough = offsetDay(last, -args.stabilizationDays);
  let refreshFrom = await previousRefreshFrom(dataDir, last, finalThrough);
  const existing = new Map<string, string>();
  const pending: string[] = [];
  for (const day of daysBetween(first, last)) {
    const path = join(dataDir, "snapshots", `${day}.json`);
    const text = await readOptional(path);
    if (text !== undefined) {
      verifyFinal(text, day, windowDays);
      if (day > finalThrough) throw new Error(`Final snapshot inside provisional window: ${day}`);
      existing.set(day, path);
    } else pending.push(day);
  }
  if (existing.size > 0 && pending[0] !== undefined && pending[0] < refreshFrom) {
    refreshFrom = pending[0];
  }
  return {
    first,
    last,
    finalThrough,
    existing,
    pending,
    refreshFrom,
    aggregateStart: offsetDay(pending[0] ?? last, 1 - windowDays),
  };
};
