import { describe, expect, it } from "vitest";
import {
  PARQUET_NAME_RE,
  parseParquetAssetDate,
  pickAssetsToDelete,
  pickParquetAssets,
} from "./policy.ts";

describe("PARQUET_NAME_RE", () => {
  it("matches the items-YYYY-MM-DD.parquet shape", () => {
    expect(PARQUET_NAME_RE.test("items-2024-05-04.parquet")).toBe(true);
    expect(PARQUET_NAME_RE.test("items.parquet")).toBe(false);
    expect(PARQUET_NAME_RE.test("items-2024-05-4.parquet")).toBe(false);
    expect(PARQUET_NAME_RE.test("items-2024-05-04.csv")).toBe(false);
  });
});

describe("parseParquetAssetDate", () => {
  it("returns YYYY-MM-DD for a valid asset name", () => {
    expect(parseParquetAssetDate("items-2024-05-04.parquet")).toBe("2024-05-04");
  });
  it("returns null for non-matching names", () => {
    expect(parseParquetAssetDate("readme.md")).toBeNull();
    expect(parseParquetAssetDate("items-2024-13-04.parquet")).toBeNull();
  });
});

describe("pickParquetAssets", () => {
  it("filters to only items-YYYY-MM-DD.parquet assets", () => {
    const assets = [
      { name: "items-2024-05-04.parquet", size: 1, url: "u" },
      { name: "readme.md", size: 1, url: "u" },
      { name: "items-2024-05-05.parquet", size: 1, url: "u" },
    ];
    expect(pickParquetAssets(assets).map((a) => a.name)).toEqual([
      "items-2024-05-04.parquet",
      "items-2024-05-05.parquet",
    ]);
  });
});

describe("pickAssetsToDelete", () => {
  it("returns assets older than today - retentionDays", () => {
    const today = new Date("2026-05-04T00:00:00Z");
    const assets = [
      { name: "items-2024-05-04.parquet", size: 1, url: "u" }, // exactly 730 days ago, KEEP
      { name: "items-2024-05-03.parquet", size: 1, url: "u" }, // 731 days ago, DELETE
      { name: "items-2026-05-03.parquet", size: 1, url: "u" }, // recent, KEEP
      { name: "noise.txt", size: 1, url: "u" }, // ignored
    ];
    expect(pickAssetsToDelete(assets, today, 730)).toEqual(["items-2024-05-03.parquet"]);
  });

  it("returns empty array when no asset is too old", () => {
    const today = new Date("2026-05-04T00:00:00Z");
    const assets = [{ name: "items-2026-05-03.parquet", size: 1, url: "u" }];
    expect(pickAssetsToDelete(assets, today, 730)).toEqual([]);
  });
});
