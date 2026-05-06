import { describe, expect, it } from "vitest";
import { decideMode } from "./decide-mode.ts";

describe("decideMode", () => {
  it("picks bootstrap when no parquet assets are present", () => {
    const out = decideMode([]);
    expect(out.mode).toBe("bootstrap");
    expect(out.existingDays).toEqual([]);
  });

  it("ignores non-parquet assets when deciding bootstrap", () => {
    expect(decideMode([{ name: "readme.md", size: 1, url: "u" }]).mode).toBe("bootstrap");
  });

  it("picks incremental + lastMaxTs from latest parquet day when present", () => {
    const assets = [
      { name: "items-2024-05-04.parquet", size: 1, url: "u" },
      { name: "items-2026-05-03.parquet", size: 1, url: "u" },
    ];
    const out = decideMode(assets);
    expect(out.mode).toBe("incremental");
    if (out.mode !== "incremental") throw new Error("expected incremental mode");
    expect(out.existingDays).toEqual(["2024-05-04", "2026-05-03"]);
    expect(out.lastMaxTs.toISOString().slice(0, 10)).toBe("2026-05-03");
  });

  it("falls back to bootstrap if every parquet name fails calendar validation", () => {
    // shape passes the regex but is calendar-invalid (Feb 30) so parseParquetAssetDate returns null
    const assets = [{ name: "items-2024-02-30.parquet", size: 1, url: "u" }];
    const out = decideMode(assets);
    expect(out.mode).toBe("bootstrap");
  });
});
