import { describe, expect, it, vi } from "vitest";
import { completeUtcDayThrough, fetchMaxTimestamp, isFreshAsOf } from "./freshness.ts";
import type { BqClient } from "./types.ts";

describe("isFreshAsOf", () => {
  const now = new Date("2026-05-04T14:00:00Z"); // 14:00 UTC today

  it("returns true when maxTs reaches the end of yesterday or later", () => {
    expect(isFreshAsOf(new Date("2026-05-03T23:45:00Z"), now)).toBe(true);
    expect(isFreshAsOf(new Date("2026-05-04T00:00:00Z"), now)).toBe(true);
  });

  it("returns false when maxTs does not reach the end of yesterday", () => {
    expect(isFreshAsOf(new Date("2026-05-03T23:44:59Z"), now)).toBe(false);
  });
});

describe("completeUtcDayThrough", () => {
  it("returns the max timestamp day once BQ reaches its end-of-day grace period", () => {
    expect(completeUtcDayThrough(new Date("2026-05-09T23:45:00Z"))).toBe("2026-05-09");
  });

  it("returns the prior day while the max timestamp day is still partial", () => {
    expect(completeUtcDayThrough(new Date("2026-05-09T23:44:59Z"))).toBe("2026-05-08");
    expect(completeUtcDayThrough(new Date("2026-05-09T12:00:00Z"))).toBe("2026-05-08");
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
