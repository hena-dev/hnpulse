import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ARCHIVE_START } from "../release/archive.ts";
import { type SnapshotJson, SnapshotJsonSchema } from "../schema/snapshot.ts";
import { snapshotWindowStart } from "./history.ts";

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
  archiveFirst = ARCHIVE_START,
) => {
  const staged: StagedSnapshot[] = [];
  for (const value of snapshots) {
    const snapshot = SnapshotJsonSchema.parse(value);
    if (
      snapshot.windowStart !==
      snapshotWindowStart(snapshot.schemaVersion, snapshot.windowEnd, windowDays, archiveFirst)
    ) {
      throw new Error(`Invalid generated snapshot window: ${snapshot.windowEnd}`);
    }
    const path = join(dir, `${snapshot.status}-${snapshot.windowEnd}.json`);
    await writeFile(path, JSON.stringify(snapshot), { flag: "wx" });
    staged.push({ day: snapshot.windowEnd, final: snapshot.status === "final", path });
  }
  return staged;
};
