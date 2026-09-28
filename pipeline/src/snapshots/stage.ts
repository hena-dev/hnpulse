import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type SnapshotJson, SnapshotJsonSchema } from "../schema/snapshot.ts";
import { offsetDay } from "./dates.ts";

export interface StagedSnapshot {
  day: string;
  final: boolean;
  path: string;
}

/** Validate the entire generated set before any immutable destination is created. */
export const stageSnapshots = async (
  dir: string,
  snapshots: Iterable<SnapshotJson>,
  windowDays: number,
) => {
  const staged: StagedSnapshot[] = [];
  for (const value of snapshots) {
    const snapshot = SnapshotJsonSchema.parse(value);
    if (snapshot.windowStart !== offsetDay(snapshot.windowEnd, 1 - windowDays)) {
      throw new Error(`Invalid generated snapshot window: ${snapshot.windowEnd}`);
    }
    const path = join(dir, `${snapshot.status}-${snapshot.windowEnd}.json`);
    await writeFile(path, JSON.stringify(snapshot), { flag: "wx" });
    staged.push({ day: snapshot.windowEnd, final: snapshot.status === "final", path });
  }
  return staged;
};
