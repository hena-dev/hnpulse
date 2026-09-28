import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { plan, snapshot } from "./_test-fixtures.ts";
import { publishSnapshots } from "./publish.ts";
import { planSnapshots, verifyFinal } from "./store.ts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "history-storage-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("snapshot history format migration", () => {
  it("keeps legacy finals byte-identical while publishing and reusing extended-history finals", async () => {
    const old = snapshot("2026-04-27");
    const extended = { ...snapshot("2026-04-28", 4), schemaVersion: 2 as const };
    const p = plan();
    await publishSnapshots({ outDir: dir, plan: p, snapshots: [old, extended], windowDays: 3 });
    const before = await readFile(join(dir, "snapshots/2026-04-27.json"), "utf8");
    const args = {
      dataDir: dir,
      first: p.first,
      last: p.last,
      windowDays: 3,
      stabilizationDays: 2,
      archiveFirst: p.archiveFirst,
    };
    const next = await planSnapshots(args);
    expect(next.existing.size).toBe(2);
    expect(next.aggregateStart).toBe("2026-04-25");
    await publishSnapshots({ outDir: dir, plan: next, snapshots: [], windowDays: 3 });
    expect(await readFile(join(dir, "snapshots/2026-04-27.json"), "utf8")).toBe(before);
    expect(() =>
      verifyFinal(JSON.stringify(extended), "2026-04-28", 3, p.archiveFirst),
    ).not.toThrow();
    expect(() =>
      verifyFinal(
        JSON.stringify({ ...extended, schemaVersion: 1 }),
        "2026-04-28",
        3,
        p.archiveFirst,
      ),
    ).toThrow();
    expect(() =>
      verifyFinal(JSON.stringify({ ...old, schemaVersion: 2 }), "2026-04-27", 3),
    ).toThrow();
    await writeFile(
      join(dir, "snapshots/2026-04-28.json"),
      JSON.stringify({ ...snapshot("2026-04-28"), schemaVersion: 2 }),
    );
    await expect(planSnapshots(args)).rejects.toThrow(/Invalid existing final/);
  });
});
