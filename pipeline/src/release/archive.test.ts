import { afterEach, describe, expect, it, vi } from "vitest";
import { stubRelease } from "../orchestrator/_test-fixtures.ts";
import { createArchiveManager, paceArchiveWrites } from "./archive.ts";

const asset = (day: string) => ({ name: `items-${day}.parquet`, size: 1, url: "u" });
afterEach(() => vi.useRealTimers());

describe("yearly archive", () => {
  it("reads legacy data, prefers yearly duplicates and sends new data to its year", async () => {
    const legacy = stubRelease([asset("2024-01-01"), asset("2025-01-01")]);
    const year = stubRelease([asset("2025-01-01")]);
    legacy.downloadAsset = vi.fn();
    year.downloadAsset = vi.fn();
    const beforeWrite = vi.fn(async () => {});
    const archive = createArchiveManager(
      (tag) => (tag === "data-snapshot" ? legacy : tag === "data-2025" ? year : stubRelease()),
      2025,
      beforeWrite,
    );
    expect(await archive.listAssets()).toHaveLength(2);
    await archive.downloadAsset("items-2024-01-01.parquet", "old");
    await archive.downloadAsset("items-2025-01-01.parquet", "new");
    expect(legacy.downloadAsset).toHaveBeenCalledWith("items-2024-01-01.parquet", "old");
    expect(year.downloadAsset).toHaveBeenCalledWith("items-2025-01-01.parquet", "new");
    await archive.deleteAsset("items-2025-01-01.parquet");
    expect(legacy.deletes).toEqual(["items-2025-01-01.parquet"]);
    expect(year.deletes).toEqual(["items-2025-01-01.parquet"]);
    await archive.uploadAsset("items-2025-01-01.parquet", "new", "application/octet-stream");
    expect(year.uploads).toEqual(["items-2025-01-01.parquet"]);
    expect(legacy.uploads).toEqual([]);
    expect(await archive.listAssets()).toHaveLength(2);
    expect(beforeWrite).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid assets and missing downloads without creating releases", async () => {
    const archive = createArchiveManager(() => stubRelease(), 2023);
    await expect(archive.downloadAsset("missing", "out")).rejects.toThrow("asset not found");
    await archive.deleteAsset("missing");
    for (const name of ["noise", "items-2022-01-01.parquet", "items-2024-01-01.parquet"]) {
      await expect(archive.uploadAsset(name, "out")).rejects.toThrow();
    }
    await archive.uploadAsset("items-2023-01-01.parquet", "out");
    expect(await archive.listAssets()).toHaveLength(1);
  });

  it("retries failed listings rather than caching the failure", async () => {
    const release = stubRelease();
    release.listAssets = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue([]);
    const archive = createArchiveManager(() => release, 2022);
    await expect(archive.listAssets()).rejects.toThrow("offline");
    expect(await archive.listAssets()).toEqual([]);
  });

  it("paces writes across rapid operations but does not delay after idle", async () => {
    vi.useFakeTimers();
    const pace = paceArchiveWrites();
    await pace();
    let finished = false;
    const waiting = pace().then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(8_999);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    await vi.advanceTimersByTimeAsync(20_000);
    await pace();
    expect(vi.getTimerCount()).toBe(0);
  });
});
