import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { SnapshotJson } from "../schema/snapshot.ts";
import { daysBetween } from "./dates.ts";
import { stageSnapshots } from "./stage.ts";
import { readOptional, type SnapshotPlan, verifyFinal } from "./store.ts";

const requireIdentical = async (source: string, text: string, day: string): Promise<void> => {
  if ((await readFile(source, "utf8")) !== text)
    throw new Error(`Conflicting existing final snapshot: ${day}`);
};

const reuseFinal = async (source: string, dest: string, day: string) => {
  if (source === dest) return;
  try {
    await copyFile(source, dest, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await requireIdentical(source, await readFile(dest, "utf8"), day);
  }
};

const copyGenerated = async (
  source: string,
  dest: string,
  day: string,
  final: boolean,
  windowDays: number,
) => {
  try {
    await copyFile(source, dest, final ? constants.COPYFILE_EXCL : 0);
  } catch (error) {
    if (!final || (error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    verifyFinal(await readFile(dest, "utf8"), day, windowDays);
  }
};

const verifyDestinations = async (outDir: string, plan: SnapshotPlan, windowDays: number) => {
  for (const day of daysBetween(plan.first, plan.finalThrough)) {
    const text = await readOptional(join(outDir, "snapshots", `${day}.json`));
    if (text === undefined) continue;
    verifyFinal(text, day, windowDays);
    const source = plan.existing.get(day);
    if (source !== undefined) await requireIdentical(source, text, day);
  }
};

export const publishSnapshots = async (args: {
  outDir: string;
  plan: SnapshotPlan;
  snapshots: Iterable<SnapshotJson>;
  windowDays: number;
}): Promise<void> => {
  const finalDir = join(args.outDir, "snapshots");
  const provisionalDir = join(args.outDir, "provisional");
  await verifyDestinations(args.outDir, args.plan, args.windowDays);
  await mkdir(args.outDir, { recursive: true });
  const staging = await mkdtemp(join(args.outDir, ".snapshot-stage-"));
  try {
    const generated = await stageSnapshots(staging, args.snapshots, args.windowDays);
    await mkdir(finalDir, { recursive: true });
    await mkdir(provisionalDir, { recursive: true });
    for (const [day, path] of args.plan.existing) {
      await reuseFinal(path, join(finalDir, `${day}.json`), day);
    }
    for (const { path, day, final } of generated) {
      await copyGenerated(
        path,
        join(final ? finalDir : provisionalDir, `${day}.json`),
        day,
        final,
        args.windowDays,
      );
    }
    for (const name of await readdir(provisionalDir)) {
      if (/^\d{4}-\d{2}-\d{2}\.json$/.test(name) && name.slice(0, 10) <= args.plan.finalThrough) {
        await unlink(join(provisionalDir, name));
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
};
