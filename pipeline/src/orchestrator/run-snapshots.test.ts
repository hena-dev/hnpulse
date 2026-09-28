import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetaJsonSchema } from "../schema/meta.ts";
import { SnapshotJsonSchema } from "../schema/snapshot.ts";
import { snapshot } from "../snapshots/_test-fixtures.ts";
import { daysBetween } from "../snapshots/dates.ts";
import { snapshotConfig, snapshotDeps } from "./_snapshot-fixtures.ts";
import { stableDailyRow, stubDuckdb, stubRelease } from "./_test-fixtures.ts";
import { runOrchestrator } from "./run.ts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "orch-snapshots-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));

describe("snapshot publication orchestration", () => {
  it("backfills with one aggregation, uploads at most the cap, and uses all local inputs", async () => {
    const deps = snapshotDeps();
    const cfg = { ...snapshotConfig(dir), uploadCap: 2 };
    const result = await runOrchestrator(deps, cfg);
    expect(result.status).toBe("completed");
    expect(result.filesUploaded).toBe(2);
    expect(deps.duckdb.queryJson).toHaveBeenCalledTimes(2);
    expect(deps.duckdb.queryJson).toHaveBeenCalledWith(
      expect.stringContaining("/parquet/items-2026-05-03.parquet"),
    );
    expect(deps.queries).toEqual([{ since: "2026-04-25", until: "2026-05-04" }]);
    expect(await readdir(join(cfg.dataOutDir, "snapshots"))).toHaveLength(5);
    expect(await readdir(join(cfg.dataOutDir, "provisional"))).toHaveLength(2);
    const final = SnapshotJsonSchema.parse(
      await readJson(join(cfg.dataOutDir, "snapshots/2026-05-01.json")),
    );
    expect(final.status).toBe("final");
    expect(final.windowStart).toBe("2026-04-26");
    expect(final.schemaVersion).toBe(2);
    const meta = MetaJsonSchema.parse(await readJson(join(cfg.dataOutDir, "meta.json")));
    expect(meta.snapshots).toEqual({
      first: "2026-04-27",
      finalThrough: "2026-05-01",
      last: "2026-05-03",
    });
    expect((await readJson(join(cfg.dataOutDir, "kpis-current.json"))).days).toHaveLength(6);
  });

  it("catches up old provisional days after missed runs and never changes a final", async () => {
    const deps = snapshotDeps();
    const cfg = snapshotConfig(dir);
    await runOrchestrator(deps, { ...cfg, now: new Date("2026-04-30T12:00:00Z") });
    const path = join(cfg.dataOutDir, "snapshots/2026-04-27.json");
    const before = await readFile(path, "utf8");
    deps.queries.length = 0;
    const result = await runOrchestrator(deps, cfg);
    expect(result.status).toBe("completed");
    expect(deps.queries[0]?.since).toBe("2026-04-28");
    expect(await readFile(path, "utf8")).toBe(before);
    expect(await readdir(join(cfg.dataOutDir, "provisional"))).toEqual([
      "2026-05-02.json",
      "2026-05-03.json",
    ]);
    expect(await readdir(join(cfg.dataOutDir, "snapshots"))).toHaveLength(5);
  });

  it("dry-run copies verified finals to a self-contained output without remote writes", async () => {
    const deps = snapshotDeps();
    const cfg = snapshotConfig(dir);
    await mkdir(join(cfg.dataOutDir, "snapshots"), { recursive: true });
    const original = JSON.stringify(snapshot("2026-04-27"));
    await writeFile(join(cfg.dataOutDir, "snapshots/2026-04-27.json"), original);
    const output = join(dir, "dry-run-data");
    const result = await runOrchestrator(deps, {
      ...cfg,
      dataOutDir: output,
      existingDataDir: cfg.dataOutDir,
      dryRun: true,
    });
    expect(result.status).toBe("completed");
    expect(deps.release.uploads).toEqual([]);
    expect(deps.release.deletes).toEqual([]);
    expect(await readFile(join(output, "snapshots/2026-04-27.json"), "utf8")).toBe(original);
    expect(await readdir(join(output, "snapshots"))).toHaveLength(5);
    expect(MetaJsonSchema.parse(await readJson(join(output, "meta.json"))).snapshots?.first).toBe(
      "2026-04-27",
    );
  });

  it("blocks all publication when historical coverage is bad although the latest window is valid", async () => {
    const deps = snapshotDeps();
    deps.duckdb = stubDuckdb(
      daysBetween("2026-04-25", "2026-05-03").map((day) =>
        stableDailyRow(day, day === "2026-04-26" ? 0 : 5),
      ),
    );
    const cfg = snapshotConfig(dir);
    const result = await runOrchestrator(deps, cfg);
    expect(result.status).toBe("invalid-source");
    await expect(readdir(cfg.dataOutDir)).rejects.toThrow();
  });

  it("rejects missing refresh coverage even when an old parquet exists", async () => {
    const deps = snapshotDeps("2026-05-01");
    deps.release = stubRelease([{ name: "items-2026-05-01.parquet", url: "u", size: 1 }]);
    const result = await runOrchestrator(deps, snapshotConfig(dir));
    expect(result.status).toBe("incomplete-source");
    expect(result.message).toMatch(/Source refresh missing.*2026-05-01/);
    expect(deps.release.uploads).toEqual([]);
  });

  it("rejects aggregate windows outside available raw coverage and missing API dependencies", async () => {
    const cfg = snapshotConfig(dir);
    await expect(
      runOrchestrator(snapshotDeps(), { ...cfg, archiveFirst: "2026-04-27" }),
    ).rejects.toThrow(/Archive must cover/);
    const deps = snapshotDeps();
    deps.bq.query = async <T>() => [{ max_ts: "2026-05-02T00:00:00Z" }] as T[];
    expect((await runOrchestrator(deps, cfg)).message).toMatch(/HN API client is required/);
  });
});
