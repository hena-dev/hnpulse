import { describe, expect, it, vi } from "vitest";
import {
  BOOTSTRAP_DAYS,
  buildExtractSql,
  computeSinceTimestamp,
  extractRows,
  OVERLAP_DAYS,
} from "./extract.ts";
import type { BqClient } from "./types.ts";

describe("buildExtractSql", () => {
  it("uses SELECT * (no column pruning) per §8.3", () => {
    expect(buildExtractSql()).toMatch(/SELECT\s+\*/i);
  });
  it("filters by timestamp >= TIMESTAMP_SECONDS(@since)", () => {
    expect(buildExtractSql()).toContain("TIMESTAMP_SECONDS(@since)");
  });
  it("references the public dataset", () => {
    expect(buildExtractSql()).toContain("bigquery-public-data.hacker_news.full");
  });
});

describe("computeSinceTimestamp", () => {
  const now = new Date("2026-05-04T14:00:00Z");

  it("bootstrap returns now - 730 days", () => {
    const since = computeSinceTimestamp({ mode: "bootstrap", now });
    const expected = new Date(now.getTime() - BOOTSTRAP_DAYS * 86_400_000);
    expect(since.toISOString()).toBe(expected.toISOString());
  });

  it("incremental returns lastMaxTs - 7 days (overlap defends late rows)", () => {
    const lastMaxTs = new Date("2026-05-03T13:06:00Z");
    const since = computeSinceTimestamp({ mode: "incremental", lastMaxTs, now });
    const expected = new Date(lastMaxTs.getTime() - OVERLAP_DAYS * 86_400_000);
    expect(since.toISOString()).toBe(expected.toISOString());
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
    await extractRows(client, { since, maxBytesBilled: 50 * 2 ** 30 });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, opts] = query.mock.calls[0] ?? [];
    expect(sql as string).toContain("SELECT *");
    expect((opts as { params: { since: number } }).params.since).toBe(
      Math.floor(since.getTime() / 1000),
    );
  });
});
