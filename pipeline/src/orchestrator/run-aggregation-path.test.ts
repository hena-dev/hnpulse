import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BqClient, BqQueryOptions } from "../bq/types.ts";
import { bqRow, stableDailyRow, stubDuckdb, stubRelease, trailingDays } from "./_test-fixtures.ts";
import { runOrchestrator } from "./run.ts";

let tmp = "";
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "hnpulse-orch-agg-"));
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("runOrchestrator — aggregation path", () => {
  it("converts API fallback rows to the same Parquet inputs aggregated by DuckDB", async () => {
    const bq: BqClient = {
      async query<T>() {
        return [{ max_ts: "2026-05-09T23:59:00.000Z" }] as unknown as readonly T[];
      },
      async *queryStream<T>(_sql: string, opts: BqQueryOptions) {
        const since = Number(opts.params?.since);
        const until = Number(opts.params?.until);
        for (let t = since; t < until; t += 86_400) {
          const day = new Date(t * 1000).toISOString().slice(0, 10);
          yield bqRow(t, `${day}T12:00:00Z`) as T;
        }
      },
    };
    const duck = stubDuckdb(trailingDays(5, "2026-05-11").map((d) => stableDailyRow(d)));

    await runOrchestrator(
      {
        bq,
        duckdb: duck,
        release: stubRelease([]),
        hnApi: {
          maxItem: async () => 3,
          item: async (id) =>
            ({
              3: { id: 3, type: "story", time: Date.parse("2026-05-11T01:00:00Z") / 1000 },
              2: { id: 2, type: "comment", time: Date.parse("2026-05-10T02:00:00Z") / 1000 },
              1: { id: 1, type: "story", time: Date.parse("2026-05-09T23:59:59Z") / 1000 },
            })[id] ?? null,
        },
      },
      {
        maxBytesBilled: 50 * 2 ** 30,
        tmpDir: tmp,
        dataOutDir: join(tmp, "data"),
        buildSha: "abc",
        pipelineVersion: "1.0.0",
        now: new Date("2026-05-12T14:00:00Z"),
        windowDays: 5,
        stabilizationDays: 7,
      },
    );

    expect(duck.execute).toHaveBeenCalledWith(expect.stringContaining("items-2026-05-10.parquet"));
    expect(duck.queryJson).toHaveBeenCalledWith(expect.stringContaining("read_parquet"));
  });
});
