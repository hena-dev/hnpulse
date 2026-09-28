import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateUtcDays, parseUtcDay } from "../pipeline/src/dates/utc-day.ts";
import { SnapshotJsonSchema } from "../pipeline/src/schema/snapshot.ts";

export const assertFinalsUnchanged = (diff: string): void => {
  const changed = diff
    .trim()
    .split("\n")
    .filter((line) => line && !line.startsWith("A\t"));
  if (changed.length > 0) throw new Error(`Final snapshots are immutable:\n${changed.join("\n")}`);
};

export const checkSnapshotCoverage = (dataDir: string): number => {
  const meta = JSON.parse(readFileSync(join(dataDir, "meta.json"), "utf8"));
  if (meta.snapshots === undefined) return 0;
  const { first, finalThrough, last } = meta.snapshots;
  for (const day of [first, finalThrough, last]) parseUtcDay(day);
  const expectedFinal = new Date(parseUtcDay(last).getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (
    first !== "2025-01-01" ||
    first > last ||
    finalThrough !== expectedFinal ||
    last !== meta.dataAsOf
  ) {
    throw new Error("Invalid snapshot bounds");
  }
  const days = enumerateUtcDays(parseUtcDay(first), parseUtcDay(last));
  for (const day of days) {
    const final = day <= finalThrough;
    const path = join(dataDir, final ? "snapshots" : "provisional", `${day}.json`);
    const snapshot = SnapshotJsonSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    if (
      snapshot.windowEnd !== day ||
      snapshot.metrics.stories.length !== 730 ||
      snapshot.status !== (final ? "final" : "provisional")
    ) {
      throw new Error(`Invalid snapshot: ${path}`);
    }
  }
  return days.length;
};

export const checkSnapshots = (
  root: string,
  base = "HEAD",
  dataDir = join(root, "web/public/data"),
): number => {
  const path = "web/public/data/snapshots";
  const diff = execFileSync("git", ["diff", "--name-status", "--no-renames", base, "--", path], {
    cwd: root,
    encoding: "utf8",
  });
  assertFinalsUnchanged(diff);
  // Comparing bytes also protects files ignored by git or marked assume-unchanged.
  const previous = execFileSync("git", ["ls-tree", "-r", "--name-only", base, "--", path], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const file of previous) {
    const expected = execFileSync("git", ["show", `${base}:${file}`], { cwd: root });
    const current = join(dataDir, "snapshots", file.split("/").at(-1) as string);
    if (!existsSync(current) || !expected.equals(readFileSync(current))) {
      throw new Error(`Final snapshot changed: ${file}`);
    }
  }
  const count = checkSnapshotCoverage(dataDir);
  if (previous.length > 0 && count === 0) throw new Error("Snapshot manifest cannot be removed");
  const metaPath = "web/public/data/meta.json";
  const oldMeta = JSON.parse(
    execFileSync("git", ["show", `${base}:${metaPath}`], { cwd: root, encoding: "utf8" }),
  );
  const meta = JSON.parse(readFileSync(join(dataDir, "meta.json"), "utf8"));
  if (
    oldMeta.snapshots !== undefined &&
    (meta.snapshots === undefined ||
      meta.snapshots.last < oldMeta.snapshots.last ||
      meta.snapshots.finalThrough < oldMeta.snapshots.finalThrough)
  ) {
    throw new Error("Snapshot bounds cannot move backward");
  }
  return count;
};

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  console.info(
    `OK: ${checkSnapshots(root, process.argv[2] ?? "HEAD", process.argv[3])} snapshots validated`,
  );
}
