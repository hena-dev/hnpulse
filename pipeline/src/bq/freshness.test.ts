import { describe, expect, it, vi } from "vitest";
import { fetchMaxTimestamp, isFreshAsOf } from "./freshness.ts";
import type { BqClient } from "./types.ts";

describe("isFreshAsOf", () => {
  const now = new Date("2026-05-04T14:00:00Z"); // 14:00 UTC today

  it("returns true when maxTs is the start of yesterday or later", () => {
    const yesterdayStart = new Date("2026-05-03T00:00:00Z");
    expect(isFreshAsOf(yesterdayStart, now)).toBe(true);
    expect(isFreshAsOf(new Date("2026-05-03T13:06:00Z"), now)).toBe(true);
    expect(isFreshAsOf(new Date("2026-05-04T00:00:00Z"), now)).toBe(true);
  });

  it("returns false when maxTs is older than the start of yesterday", () => {
    expect(isFreshAsOf(new Date("2026-05-02T23:59:59Z"), now)).toBe(false);
  });
});

describe("fetchMaxTimestamp", () => {
  it("queries BQ with the public-dataset MAX(timestamp) SQL and returns a Date", async () => {
    const query = vi.fn().mockResolvedValue([{ max_ts: "2026-05-03T13:06:00.000Z" }]);
    const client: BqClient = { query };
    const out = await fetchMaxTimestamp(client, { maxBytesBilled: 1_000_000 });
    expect(out).toEqual(new Date("2026-05-03T13:06:00.000Z"));
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("MAX(timestamp)");
    expect(sql).toContain("bigquery-public-data.hacker_news.full");
  });

  it("throws when BQ returns no rows", async () => {
    const client: BqClient = { query: vi.fn().mockResolvedValue([]) };
    await expect(fetchMaxTimestamp(client, { maxBytesBilled: 1 })).rejects.toThrow();
  });

  it("throws when max_ts is null", async () => {
    const client: BqClient = { query: vi.fn().mockResolvedValue([{ max_ts: null }]) };
    await expect(fetchMaxTimestamp(client, { maxBytesBilled: 1 })).rejects.toThrow();
  });

  it("accepts the BigQuery timestamp `{ value: '...' }` shape", async () => {
    const client: BqClient = {
      query: vi.fn().mockResolvedValue([{ max_ts: { value: "2026-05-03T13:06:00Z" } }]),
    };
    const out = await fetchMaxTimestamp(client, { maxBytesBilled: 1 });
    expect(out.toISOString()).toBe("2026-05-03T13:06:00.000Z");
  });

  it("throws on an unexpected shape", async () => {
    const client: BqClient = {
      query: vi.fn().mockResolvedValue([{ max_ts: 12345 }]),
    };
    await expect(fetchMaxTimestamp(client, { maxBytesBilled: 1 })).rejects.toThrow();
  });
});
