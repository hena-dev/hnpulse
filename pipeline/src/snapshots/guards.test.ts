import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { plan, snapshot } from "./_test-fixtures.ts";
import { publishSnapshots } from "./publish.ts";
import { planSnapshots } from "./store.ts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "snapshot-guards-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("snapshot publication safeguards", () => {
  it("rejects backward latest or finalThrough dates before planning extraction", async () => {
    for (const snapshots of [
      { last: "2026-05-04", finalThrough: "2026-05-01" },
      { last: "2026-05-03", finalThrough: "2026-05-02" },
    ]) {
      await writeFile(join(dir, "meta.json"), JSON.stringify({ snapshots }));
      await expect(
        planSnapshots({
          dataDir: dir,
          first: "2026-04-27",
          last: "2026-05-03",
          windowDays: 3,
          stabilizationDays: 2,
        }),
      ).rejects.toThrow(/backward/);
    }
  });
  it("validates every generated snapshot before writing any immutable final", async () => {
    for (const bad of [
      snapshot("2026-04-28", 2),
      { ...snapshot("2026-04-28"), metrics: { ...snapshot().metrics, jobs: [] } },
    ]) {
      await expect(
        publishSnapshots({
          outDir: dir,
          plan: plan(),
          snapshots: [snapshot("2026-04-27"), bad],
          windowDays: 3,
        }),
      ).rejects.toThrow();
      expect(await readdir(dir)).toEqual([]);
    }
  });
  it("rejects dry-run finals with bytes different from their published sources", async () => {
    const source = join(dir, "production.json");
    await writeFile(source, JSON.stringify(snapshot("2026-04-27")));
    const p = plan();
    p.existing.set("2026-04-27", source);
    await mkdir(join(dir, "snapshots"));
    const path = join(dir, "snapshots/2026-04-27.json");
    const stale = JSON.stringify({
      ...snapshot("2026-04-27"),
      lastUpdated: "2026-05-01T00:00:00Z",
    });
    await writeFile(path, stale);
    await expect(
      publishSnapshots({
        outDir: dir,
        plan: p,
        snapshots: [snapshot("2026-04-28")],
        windowDays: 3,
      }),
    ).rejects.toThrow(/Conflicting/);
    expect(await readFile(path, "utf8")).toBe(stale);
    expect(await readdir(join(dir, "snapshots"))).toEqual(["2026-04-27.json"]);
  });
});
