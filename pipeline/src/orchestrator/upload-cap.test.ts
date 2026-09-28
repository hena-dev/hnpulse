import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bqRow, NOW, stubDuckdb, stubRelease } from "./_test-fixtures.ts";
import { runUploadStep } from "./upload-step.ts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "upload-cap-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
const args = () => ({
  rows: ["2023-01-02", "2026-05-01", "2023-01-01", "2026-05-03", "2026-05-02"].map((day, i) =>
    bqRow(i, `${day}T12:00:00Z`),
  ),
  tmpDir: dir,
  release: stubRelease(),
  duckdb: stubDuckdb([]),
  now: NOW,
  retentionDays: 730,
  existingAssets: [{ name: "items-2026-05-01.parquet", url: "u", size: 1 }],
});

describe("archive upload budget", () => {
  it("prioritizes refreshed days, then oldest missing archive days, and preserves local inputs", async () => {
    const input = args();
    const result = await runUploadStep({ ...input, uploadCap: 4, refreshFrom: "2026-05-01" });
    expect(result.uploaded).toEqual([
      "items-2026-05-01.parquet",
      "items-2026-05-02.parquet",
      "items-2026-05-03.parquet",
      "items-2023-01-01.parquet",
    ]);
    expect(result.localFiles.size).toBe(5);
    expect(result.deleted).toEqual(["items-2026-05-01.parquet"]);
  });
  it("with cap zero or dry-run skips even replacement deletes while converting all inputs", async () => {
    for (const options of [{ uploadCap: 0 }, { dryRun: true }]) {
      const input = args();
      const result = await runUploadStep({ ...input, ...options });
      expect(input.release.uploads).toEqual([]);
      expect(input.release.deletes).toEqual([]);
      expect(result.localFiles.size).toBe(5);
    }
  });
  it("rejects invalid caps", async () => {
    for (const uploadCap of [-1, 1.5, Number.NaN]) {
      await expect(runUploadStep({ ...args(), uploadCap })).rejects.toThrow(/uploadCap/);
    }
  });
});
