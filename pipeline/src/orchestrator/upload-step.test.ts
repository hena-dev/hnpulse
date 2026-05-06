import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuckdbRunner } from "../duckdb/types.ts";
import type { ReleaseAsset, ReleaseManager } from "../release/types.ts";
import type { BqRow } from "../schema/bq-row.ts";
import { runUploadStep } from "./upload-step.ts";

const row = (id: number, ts: string): BqRow => ({
  id,
  type: "story",
  by: "alice",
  title: null,
  url: null,
  text: null,
  score: 1,
  time: Math.floor(new Date(ts).getTime() / 1000),
  timestamp: ts,
  parent: null,
  descendants: null,
  ranking: null,
  dead: false,
  deleted: false,
});

const stubRelease = () => {
  const uploads: string[] = [];
  const deletes: string[] = [];
  const r: ReleaseManager = {
    listAssets: async () => [],
    uploadAsset: async (name) => {
      uploads.push(name);
      return { name, size: 1, url: "u" };
    },
    deleteAsset: async (name) => {
      deletes.push(name);
    },
    downloadAsset: async () => undefined,
  };
  return { release: r, uploads, deletes };
};

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "hnpulse-up-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runUploadStep", () => {
  it("converts NDJSON → parquet via DuckDB and uploads one asset per day", async () => {
    const { release, uploads } = stubRelease();
    const duckdb: DuckdbRunner = {
      execute: vi.fn(async () => ""),
      queryJson: vi.fn(async () => []),
    };
    const rows = [row(1, "2026-05-03T01:00:00Z"), row(2, "2026-05-04T01:00:00Z")];
    const out = await runUploadStep({
      rows,
      tmpDir: dir,
      release,
      duckdb,
      now: new Date("2026-05-04T14:00:00Z"),
      retentionDays: 730,
      existingAssets: [],
    });
    expect(out.uploaded).toContain("items-2026-05-03.parquet");
    expect(out.uploaded).toContain("items-2026-05-04.parquet");
    expect(uploads.length).toBe(2);
    expect(duckdb.execute).toHaveBeenCalledTimes(2);
  });

  it("deletes assets older than retentionDays", async () => {
    const { release, deletes } = stubRelease();
    const duckdb: DuckdbRunner = {
      execute: vi.fn(async () => ""),
      queryJson: vi.fn(async () => []),
    };
    const old: ReleaseAsset = { name: "items-2023-01-01.parquet", size: 1, url: "u" };
    const out = await runUploadStep({
      rows: [],
      tmpDir: dir,
      release,
      duckdb,
      now: new Date("2026-05-04T14:00:00Z"),
      retentionDays: 730,
      existingAssets: [old],
    });
    expect(out.deleted).toContain("items-2023-01-01.parquet");
    expect(deletes).toContain("items-2023-01-01.parquet");
  });
});
