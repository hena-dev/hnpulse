import { describe, expect, it, vi } from "vitest";
import {
  BOOTSTRAP_DAYS,
  buildExtractSql,
  computeSinceTimestamp,
  extractRows,
  extractRowsStream,
} from "./extract.ts";
import type { BqClient } from "./types.ts";

describe("buildExtractSql", () => {
  it("uses SELECT * (no column pruning) per §8.3", () => {
    expect(buildExtractSql()).toMatch(/SELECT\s+\*/i);
  });
  it("formats timestamp as a plain UTC string for NDJSON serialization", () => {
    expect(buildExtractSql()).toContain("FORMAT_TIMESTAMP");
    expect(buildExtractSql()).toContain("AS timestamp");
  });
  it("filters by timestamp >= TIMESTAMP_SECONDS(@since)", () => {
    expect(buildExtractSql()).toContain("TIMESTAMP_SECONDS(@since)");
  });
  it("excludes rows at or after the supplied until timestamp", () => {
    expect(buildExtractSql()).toContain("TIMESTAMP_SECONDS(@until)");
  });
  it("references the public dataset", () => {
    expect(buildExtractSql()).toContain("bigquery-public-data.hacker_news.full");
  });
});

describe("computeSinceTimestamp", () => {
  const now = new Date("2026-05-04T14:00:00Z");

  it("bootstrap returns start of UTC day at now - 730 days", () => {
    const since = computeSinceTimestamp({ mode: "bootstrap", now });
    const expected = new Date(now.getTime() - BOOTSTRAP_DAYS * 86_400_000);
    expected.setUTCHours(0, 0, 0, 0);
    expect(since.toISOString()).toBe(expected.toISOString());
  });

  it("incremental returns the first instant after the latest parquet day", () => {
    const lastMaxTs = new Date("2026-05-02T23:59:59.999Z");
    const since = computeSinceTimestamp({ mode: "incremental", lastMaxTs, now });
    expect(since.toISOString()).toBe("2026-05-03T00:00:00.000Z");
  });

  it("throws if mode is incremental without lastMaxTs", () => {
    expect(() => computeSinceTimestamp({ mode: "incremental", now })).toThrow();
  });
});

describe("extractRows", () => {
  it("queries BQ with SELECT * and the supplied since param", async () => {
    const query = vi.fn().mockResolvedValue([{ id: 1, type: "story" }]);
    const client: BqClient = { query };
    const since = new Date("2024-05-04T00:00:00Z");
    const until = new Date("2024-05-05T00:00:00Z");
    await extractRows(client, { since, until, maxBytesBilled: 50 * 2 ** 30 });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, opts] = query.mock.calls[0] ?? [];
    expect(sql as string).toContain("SELECT *");
    expect((opts as { params: { since: number } }).params.since).toBe(
      Math.floor(since.getTime() / 1000),
    );
    expect((opts as { params: { until: number } }).params.until).toBe(
      Math.floor(until.getTime() / 1000),
    );
  });

  it("streams rows with queryStream when available", async () => {
    const queryStream: NonNullable<BqClient["queryStream"]> = async function* <T>() {
      yield { id: 1, type: "story" } as T;
      yield { id: 2, type: "comment" } as T;
    };
    const client: BqClient = {
      query: vi.fn(async () => []),
      queryStream: vi.fn(queryStream) as NonNullable<BqClient["queryStream"]>,
    };
    const rows = [];
    for await (const row of extractRowsStream(client, {
      since: new Date("2024-05-04T00:00:00Z"),
      until: new Date("2024-05-05T00:00:00Z"),
      maxBytesBilled: 50 * 2 ** 30,
    })) {
      rows.push(row);
    }
    expect(rows).toHaveLength(2);
    expect(client.query).not.toHaveBeenCalled();
  });
});
