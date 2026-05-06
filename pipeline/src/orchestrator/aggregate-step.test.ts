import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuckdbRunner } from "../duckdb/types.ts";
import type { ReleaseAsset, ReleaseManager } from "../release/types.ts";
import { downloadAllParquet, runAggregateStep } from "./aggregate-step.ts";

const ASSETS: ReleaseAsset[] = [
  { name: "items-2024-05-04.parquet", size: 1, url: "u" },
  { name: "items-2024-05-05.parquet", size: 1, url: "u" },
  { name: "readme.md", size: 1, url: "u" },
];

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "hnpulse-agg-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const firstAsset = (): ReleaseAsset => {
  const a = ASSETS[0];
  if (a === undefined) throw new Error("missing fixture");
  return a;
};

describe("downloadAllParquet", () => {
  it("downloads only parquet assets to destDir", async () => {
    const downloaded: string[] = [];
    const release: ReleaseManager = {
      listAssets: async () => ASSETS,
      uploadAsset: async () => firstAsset(),
      deleteAsset: async () => undefined,
      downloadAsset: async (name) => {
        downloaded.push(name);
      },
    };
    const out = await downloadAllParquet(release, ASSETS, dir);
    expect(downloaded).toEqual(["items-2024-05-04.parquet", "items-2024-05-05.parquet"]);
    expect(out).toHaveLength(2);
  });
});

describe("runAggregateStep", () => {
  it("runs both queries and assembles KpisJson", async () => {
    const dailyRow = (day: string) => ({
      day,
      stories: 1,
      comments: 1,
      active_commenters: 1,
      active_submitters: 1,
      median_score: 50,
      p90_score: 50,
      comments_per_story: 1,
      success_rate_gte100: 0,
      show_hn: 0,
      ask_hn: 0,
      jobs: 0,
      dead_flagged_ratio: 0,
    });
    const release: ReleaseManager = {
      listAssets: async () => ASSETS,
      uploadAsset: async () => firstAsset(),
      deleteAsset: async () => undefined,
      downloadAsset: async () => undefined,
    };
    const queryJson = vi.fn(async (sql: string) => {
      if (sql.includes("dead_flagged_ratio")) {
        return [dailyRow("2024-05-04"), dailyRow("2024-05-05")];
      }
      return [{ day: "2024-05-04", url: "https://github.com/x" }];
    });
    const duckdb: DuckdbRunner = {
      execute: vi.fn(async () => ""),
      queryJson: queryJson as unknown as DuckdbRunner["queryJson"],
    };
    const kpis = await runAggregateStep({
      release,
      duckdb,
      tmpDir: dir,
      windowStart: "2024-05-04",
      windowEnd: "2024-05-05",
      assets: ASSETS,
    });
    expect(kpis.days).toEqual(["2024-05-04", "2024-05-05"]);
    expect(kpis.metrics.stories).toEqual([1, 1]);
    expect(kpis.topDomainsByDay[0]?.domains[0]?.name).toBe("github.com");
  });
});
