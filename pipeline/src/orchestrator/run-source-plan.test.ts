import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BqClient, BqQueryOptions } from "../bq/types.ts";
import {
  bqRow,
  NOW,
  stableDailyRow,
  stubBq,
  stubDuckdb,
  stubRelease,
  trailingDays,
} from "./_test-fixtures.ts";
import { runOrchestrator } from "./run.ts";

let tmp = "";
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "hnpulse-orch-plan-"));
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const baseCfg = (overrides: Partial<Parameters<typeof runOrchestrator>[1]> = {}) => ({
  maxBytesBilled: 50 * 2 ** 30,
  tmpDir: tmp,
  dataOutDir: join(tmp, "data"),
  buildSha: "abc",
  pipelineVersion: "1.0.0",
  now: NOW,
  windowDays: 7,
  ...overrides,
});

describe("runOrchestrator — source planning", () => {
  it("publishes through yesterday by using HN API for closed days beyond BQ completeness", async () => {
    const now = new Date("2026-05-12T14:00:00Z");
    const bqCalls: Array<Readonly<Record<string, unknown>> | undefined> = [];
    const bq: BqClient = {
      async query<T>(sql: string) {
        if (sql.includes("MAX(timestamp)")) {
          return [{ max_ts: "2026-05-09T23:59:00.000Z" }] as unknown as readonly T[];
        }
        return [];
      },
      async *queryStream<T>(_sql: string, opts: BqQueryOptions) {
        bqCalls.push(opts.params);
        const since = Number(opts.params?.since);
        const until = Number(opts.params?.until);
        for (let t = since; t < until; t += 86_400) {
          const day = new Date(t * 1000).toISOString().slice(0, 10);
          yield bqRow(t, `${day}T12:00:00Z`) as T;
        }
      },
    };
    const hnApiItems = new Map<number, unknown>([
      [5, { id: 5, type: "story", time: Date.parse("2026-05-12T01:00:00Z") / 1000 }],
      [4, { id: 4, type: "story", time: Date.parse("2026-05-11T01:00:00Z") / 1000 }],
      [3, { id: 3, type: "comment", time: Date.parse("2026-05-10T02:00:00Z") / 1000 }],
      [2, { id: 2, type: "story", time: Date.parse("2026-05-09T23:59:59Z") / 1000 }],
    ]);
    const release = stubRelease([{ name: "items-2026-05-04.parquet", size: 1, url: "u" }]);
    const days = trailingDays(8, "2026-05-11");
    const duck = stubDuckdb(days.map((d) => stableDailyRow(d)));

    const result = await runOrchestrator(
      {
        bq,
        release,
        duckdb: duck,
        hnApi: {
          maxItem: async () => 5,
          item: async (id) => hnApiItems.get(id) ?? null,
        },
      },
      baseCfg({ now, windowDays: 8, stabilizationDays: 7 }),
    );

    expect(result.status).toBe("completed");
    expect(bqCalls).toEqual([
      {
        since: Date.parse("2026-05-05T00:00:00Z") / 1000,
        until: Date.parse("2026-05-10T00:00:00Z") / 1000,
      },
    ]);
    expect(release.uploads).toEqual([
      "items-2026-05-05.parquet",
      "items-2026-05-06.parquet",
      "items-2026-05-07.parquet",
      "items-2026-05-08.parquet",
      "items-2026-05-09.parquet",
      "items-2026-05-10.parquet",
      "items-2026-05-11.parquet",
    ]);
    expect(release.uploads).not.toContain("items-2026-05-12.parquet");
    expect(result.kpisFile).toMatch(/^\/data\/kpis\.[a-f0-9]{7}\.json$/);
  });

  it("does not publish when immutable missing days cannot be filled from BQ", async () => {
    const result = await runOrchestrator(
      {
        bq: stubBq([], new Date("2026-05-01T00:00:00Z")),
        release: stubRelease([{ name: "items-2026-05-02.parquet", size: 1, url: "u" }]),
        duckdb: stubDuckdb([]),
        hnApi: { maxItem: async () => 0, item: async () => null },
      },
      baseCfg({ now: new Date("2026-05-12T14:00:00Z"), windowDays: 11, stabilizationDays: 7 }),
    );

    expect(result.status).toBe("incomplete-source");
  });
});
