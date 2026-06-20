import { vi } from "vitest";
import type { BqAggregateRow } from "../bq/aggregate.ts";
import type { BqClient } from "../bq/types.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import type { ReleaseAsset, ReleaseManager } from "../release/types.ts";
import type { BqRow } from "../schema/bq-row.ts";

export const NOW = new Date("2026-05-04T14:00:00Z");

export const bqRow = (
  id: number,
  ts: string,
  type: BqRow["type"] = "story",
  extra: Partial<BqRow> = {},
): BqRow => ({
  id,
  type,
  by: "alice",
  title: type === "story" ? "Show HN: hi" : null,
  url: type === "story" ? "https://github.com/x" : null,
  text: null,
  score: 50,
  time: Math.floor(new Date(ts).getTime() / 1000),
  timestamp: ts,
  parent: null,
  descendants: null,
  ranking: null,
  dead: false,
  deleted: false,
  ...extra,
});

export const stubBq = (rows: readonly unknown[], maxTs: Date | null = NOW): BqClient => ({
  async query<T = Record<string, unknown>>(sql: string): Promise<readonly T[]> {
    if (sql.includes("MAX(timestamp)")) {
      return [{ max_ts: maxTs?.toISOString() ?? null }] as unknown as readonly T[];
    }
    return rows as unknown as readonly T[];
  },
});

export interface StubReleaseHandle extends ReleaseManager {
  uploads: string[];
  deletes: string[];
}

export const stubRelease = (initial: ReleaseAsset[] = []): StubReleaseHandle => {
  const assets = [...initial];
  const uploads: string[] = [];
  const deletes: string[] = [];
  return {
    listAssets: async () => assets,
    uploadAsset: async (name) => {
      uploads.push(name);
      const a: ReleaseAsset = { name, size: 1, url: `u://${name}` };
      assets.push(a);
      return a;
    },
    deleteAsset: async (name) => {
      deletes.push(name);
      const index = assets.findIndex((a) => a.name === name);
      if (index >= 0) assets.splice(index, 1);
    },
    downloadAsset: async () => undefined,
    uploads,
    deletes,
  };
};

export const stubDuckdb = (rows: Record<string, unknown>[]): DuckdbRunner => ({
  execute: vi.fn(async () => ""),
  queryJson: vi.fn(async (sql: string) => {
    if (sql.includes("dead_flagged_ratio")) return rows as never;
    if (sql.includes("AS day, url")) {
      return [{ day: "2026-05-03", url: "https://github.com/foo" }] as never;
    }
    return [] as never;
  }),
});

export const stableDailyRow = (day: string, stories = 5) => ({
  day,
  stories,
  comments: 5,
  active_commenters: 1,
  active_submitters: 1,
  median_score: 50,
  p90_score: 50,
  comments_per_story: 1,
  success_rate_gte100: 0,
  show_hn: 5,
  ask_hn: 0,
  jobs: 0,
  dead_flagged_ratio: 0,
  dead_flagged_total: stories + 5,
});

export const stableBqAggregateRow = (day: string, stories = 5): BqAggregateRow => ({
  ...stableDailyRow(day, stories),
  top_domains: stories > 0 ? [{ name: "github.com", stories, share: 1 }] : [],
});

export const trailingDays = (count: number, from: string): string[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (count - 1 - i));
    return d.toISOString().slice(0, 10);
  });
