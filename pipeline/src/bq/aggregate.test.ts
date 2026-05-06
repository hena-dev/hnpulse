import { describe, expect, it, vi } from "vitest";
import { aggregateKpisFromBq, type BqAggregateRow, buildBqAggregateSql } from "./aggregate.ts";
import type { BqClient, BqQueryOptions } from "./types.ts";

const row = (
  day: string,
  stories: number,
  topDomains: BqAggregateRow["top_domains"],
): BqAggregateRow => ({
  day,
  stories,
  comments: stories * 2,
  active_commenters: stories,
  active_submitters: stories,
  median_score: 10,
  p90_score: 100,
  comments_per_story: 2,
  success_rate_gte100: 0.25,
  show_hn: 1,
  ask_hn: 0,
  jobs: 0,
  dead_flagged_ratio: 0.01,
  top_domains: topDomains,
});

describe("buildBqAggregateSql", () => {
  it("builds one grouped query over the HN public table", () => {
    const sql = buildBqAggregateSql();
    expect(sql).toContain("bigquery-public-data.hacker_news.full");
    expect(sql).toContain("GENERATE_DATE_ARRAY");
    expect(sql).toContain("NET.REG_DOMAIN");
    expect(sql).toContain("@windowStart");
    expect(sql).toContain("@windowEnd");
  });
});

describe("aggregateKpisFromBq", () => {
  it("aligns BigQuery aggregate rows to the requested window", async () => {
    const query = vi.fn(async () => [
      row("2026-05-02", 3, [{ name: "github.com", stories: 2, share: 2 / 3 }]),
      row("2026-05-03", 4, null),
    ]);
    const client: BqClient = {
      query: query as unknown as BqClient["query"],
    };

    const kpis = await aggregateKpisFromBq(client, {
      windowStart: "2026-05-01",
      windowEnd: "2026-05-03",
      maxBytesBilled: 123,
    });
    const call = query.mock.calls[0] as [string, BqQueryOptions] | undefined;

    expect(call?.[1]).toEqual({
      maxBytesBilled: 123,
      params: { windowStart: "2026-05-01", windowEnd: "2026-05-03" },
    });
    expect(kpis.days).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
    expect(kpis.metrics.stories).toEqual([0, 3, 4]);
    expect(kpis.metrics.comments).toEqual([0, 6, 8]);
    expect(kpis.topDomainsByDay).toEqual([
      { date: "2026-05-01", domains: [] },
      { date: "2026-05-02", domains: [{ name: "github.com", stories: 2, share: 2 / 3 }] },
      { date: "2026-05-03", domains: [] },
    ]);
  });
});
