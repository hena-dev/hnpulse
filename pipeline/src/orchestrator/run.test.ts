import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BqClient, BqQueryOptions } from "../bq/types.ts";
import { offsetDay } from "../snapshots/dates.ts";
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
  tmp = await mkdtemp(join(tmpdir(), "hnpulse-orch-"));
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
  snapshotFirst: "2026-05-03",
  archiveFirst: offsetDay("2026-05-03", 1 - (overrides.windowDays ?? 7)),
  ...overrides,
});

describe("runOrchestrator — happy path (incremental)", () => {
  it("uploads parquets, runs aggregations, emits kpis & meta", async () => {
    const bq = stubBq(
      trailingDays(7, "2026-05-03").map((day, i) => bqRow(i + 1, `${day}T12:00:00Z`)),
    );
    const release = stubRelease([
      { name: "items-2024-05-04.parquet", size: 1, url: "u" },
      { name: "items-2026-05-02.parquet", size: 1, url: "u" },
    ]);
    const days = trailingDays(7, "2026-05-03");
    const duck = stubDuckdb(days.map((d) => stableDailyRow(d)));
    const result = await runOrchestrator({ bq, release, duckdb: duck }, baseCfg());
    expect(result.status).toBe("completed");
    expect(result.kpisFile).toMatch(/^\/data\/kpis\.[a-f0-9]{7}\.json$/);
    expect(release.uploads).toContain("items-2026-05-03.parquet");
  });

  it("rewrites the full 7-day stabilization window", async () => {
    const calls: { sql: string; opts: { params?: Readonly<Record<string, unknown>> } }[] = [];
    const bq: BqClient = {
      async query<T>(sql: string, opts: BqQueryOptions) {
        calls.push({ sql, opts });
        if (sql.includes("MAX(timestamp)")) {
          return [{ max_ts: NOW.toISOString() }] as unknown as readonly T[];
        }
        return trailingDays(7, "2026-05-03").map((day, i) =>
          bqRow(i + 1, `${day}T12:00:00Z`),
        ) as unknown as readonly T[];
      },
    };
    const release = stubRelease([{ name: "items-2026-05-02.parquet", size: 1, url: "u" }]);
    const duck = stubDuckdb(trailingDays(7, "2026-05-03").map((d) => stableDailyRow(d)));

    await runOrchestrator({ bq, release, duckdb: duck }, baseCfg());

    const extractCall = calls.find((call) => call.sql.includes("TIMESTAMP_SECONDS(@since)"));
    expect(extractCall?.opts.params).toEqual({
      since: Date.parse("2026-04-27T00:00:00Z") / 1000,
      until: Date.parse("2026-05-04T00:00:00Z") / 1000,
    });
    expect(release.uploads).toEqual(
      trailingDays(7, "2026-05-03").map((day) => `items-${day}.parquet`),
    );
  });
});

describe("runOrchestrator — bootstrap path", () => {
  it("seeds release parquet assets before aggregating when no parquet assets are present", async () => {
    const days = trailingDays(7, "2026-05-03");
    const bq = stubBq(days.map((d, i) => bqRow(i + 1, `${d}T12:00:00Z`)));
    const release = stubRelease([]);
    const duck = stubDuckdb(days.map((d) => stableDailyRow(d)));
    const result = await runOrchestrator({ bq, release, duckdb: duck }, baseCfg());
    expect(result.status).toBe("completed");
    expect(result.message).toBe("OK");
    expect(release.uploads).toEqual(days.map((d) => `items-${d}.parquet`));
  });

  it("defaults bootstrap output to the full retention window", async () => {
    const { windowDays: _windowDays, ...cfg } = baseCfg({ windowDays: 730 });
    const days = trailingDays(730, "2026-05-03");
    const bq = stubBq(days.map((d, i) => bqRow(i + 1, `${d}T12:00:00Z`)));
    const result = await runOrchestrator(
      { bq, release: stubRelease([]), duckdb: stubDuckdb(days.map((d) => stableDailyRow(d))) },
      cfg,
    );
    expect(result.rowsExtracted).toBe(730);
    expect(result.filesUploaded).toBe(400);
  });
});

describe("runOrchestrator — no-rows path", () => {
  it("returns no-rows when incremental mode pulls 0 rows", async () => {
    const bq = stubBq([]);
    const release = stubRelease([{ name: "items-2026-05-02.parquet", size: 1, url: "u" }]);
    const result = await runOrchestrator(
      { bq, release, duckdb: stubDuckdb([]) },
      baseCfg({ maxBytesBilled: 1 }),
    );
    expect(result.status).toBe("no-rows");
  });
});

describe("runOrchestrator — validation gate", () => {
  it("does not reject valid data when sparse jobs drops to zero", async () => {
    const days = trailingDays(8, "2026-05-03");
    const bq = stubBq(days.map((d, i) => bqRow(i + 1, `${d}T12:00:00Z`)));
    const release = stubRelease([]);
    const duck = stubDuckdb(
      days.map((d, i) => ({ ...stableDailyRow(d, 10), jobs: i === days.length - 1 ? 0 : 1 })),
    );
    const result = await runOrchestrator({ bq, release, duckdb: duck }, baseCfg({ windowDays: 8 }));
    expect(result.status).toBe("completed");
  });

  it("returns invalid-source when a metric is wildly off the 7-day median", async () => {
    const days = trailingDays(8, "2026-05-03");
    const bq = stubBq(days.map((d, i) => bqRow(i + 1, `${d}T12:00:00Z`)));
    const release = stubRelease([]);
    const duck = stubDuckdb(
      days.map((d, i) => stableDailyRow(d, i === days.length - 1 ? 1000 : 10)),
    );
    const result = await runOrchestrator({ bq, release, duckdb: duck }, baseCfg({ windowDays: 8 }));
    expect(result.status).toBe("invalid-source");
    expect(result.message).toMatch(/Validation failed/);
  });

  it("returns invalid-source when the date-coverage check finds an empty day", async () => {
    const days = trailingDays(7, "2026-05-03");
    const bq = stubBq(days.map((d, i) => bqRow(i + 1, `${d}T12:00:00Z`)));
    const release = stubRelease([]);
    const duck = stubDuckdb(days.map((d, i) => stableDailyRow(d, i === days.length - 1 ? 0 : 10)));
    const result = await runOrchestrator({ bq, release, duckdb: duck }, baseCfg());
    expect(result.status).toBe("invalid-source");
    expect(result.message).toMatch(/date coverage/);
  });
});
