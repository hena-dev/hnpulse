import { join } from "node:path";
import type { BqClient, BqQueryOptions } from "../bq/types.ts";
import { daysBetween, offsetDay } from "../snapshots/dates.ts";
import { bqRow, NOW, stableDailyRow, stubDuckdb, stubRelease } from "./_test-fixtures.ts";

export const snapshotConfig = (dir: string) => ({
  maxBytesBilled: 100,
  tmpDir: join(dir, "tmp"),
  dataOutDir: join(dir, "data"),
  buildSha: "abc",
  pipelineVersion: "1",
  now: NOW,
  windowDays: 3,
  stabilizationDays: 2,
  snapshotFirst: "2026-04-27",
  archiveFirst: "2026-04-25",
});

export const snapshotDeps = (missing?: string) => {
  const queries: { since: string; until: string }[] = [];
  const bq: BqClient = {
    async query<T>() {
      return [{ max_ts: "2026-05-04T12:00:00Z" }] as T[];
    },
    async *queryStream<T>(_sql: string, opts: BqQueryOptions) {
      const since = new Date(Number(opts.params?.since) * 1000).toISOString().slice(0, 10);
      const until = new Date(Number(opts.params?.until) * 1000).toISOString().slice(0, 10);
      queries.push({ since, until });
      for (const [i, day] of daysBetween(since, offsetDay(until, -1)).entries()) {
        if (day !== missing) yield bqRow(i, `${day}T12:00:00Z`) as T;
      }
    },
  };
  const days = daysBetween("2026-04-25", "2026-05-03");
  return {
    bq,
    queries,
    release: stubRelease(),
    duckdb: stubDuckdb(days.map((day) => stableDailyRow(day))),
  };
};
