import { describe, expect, it } from "vitest";
import { buildDailyMetricsSql, buildDomainRowsSql } from "./sql.ts";

describe("buildDailyMetricsSql", () => {
  const sql = buildDailyMetricsSql({
    parquetGlob: "./tmp/items-*.parquet",
    windowStart: "2024-05-04",
    windowEnd: "2026-05-03",
  });

  it("reads from the supplied parquet glob", () => {
    expect(sql).toContain("read_parquet('./tmp/items-*.parquet')");
  });

  it("filters timestamp to the window inclusive", () => {
    expect(sql).toContain("TIMESTAMP '2024-05-04 00:00:00'");
    expect(sql).toContain("TIMESTAMP '2026-05-04 00:00:00'");
  });

  it("dedupes by id", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\)\s+OVER\s*\(\s*PARTITION BY id/);
  });

  it("computes every metric column", () => {
    for (const col of [
      "stories",
      "comments",
      "active_commenters",
      "active_submitters",
      "median_score",
      "p90_score",
      "comments_per_story",
      "success_rate_gte100",
      "show_hn",
      "ask_hn",
      "jobs",
      "dead_flagged_ratio",
      "dead_flagged_total",
    ]) {
      expect(sql).toContain(col);
    }
  });

  it("quotes the Hacker News author column for DuckDB", () => {
    expect(sql).toContain('COUNT(DISTINCT "by")');
  });

  it("counts only story rows as stories", () => {
    expect(sql).toContain("type = 'story'");
  });

  it("excludes deleted/dead from main metrics but keeps for ratio", () => {
    expect(sql).toMatch(/coalesce\(deleted,\s*false\)\s*=\s*false/);
    expect(sql).toMatch(/coalesce\(dead,\s*false\)\s*=\s*false/);
  });

  it("orders by day ascending", () => {
    expect(sql).toMatch(/ORDER BY d ASC/);
  });

  it("escapes single quotes in the parquet glob", () => {
    const out = buildDailyMetricsSql({
      parquetGlob: "./tmp/it'ems.parquet",
      windowStart: "2024-01-01",
      windowEnd: "2024-01-02",
    });
    expect(out).toContain("./tmp/it''ems.parquet");
  });

  it("rejects malformed dates", () => {
    expect(() =>
      buildDailyMetricsSql({
        parquetGlob: "./x",
        windowStart: "bad",
        windowEnd: "2024-01-02",
      }),
    ).toThrow();
  });
});

describe("buildDomainRowsSql", () => {
  const sql = buildDomainRowsSql({
    parquetGlob: "./tmp/items-*.parquet",
    windowStart: "2024-05-04",
    windowEnd: "2026-05-03",
  });

  it("selects only stories with non-null urls", () => {
    expect(sql).toContain("type = 'story'");
    expect(sql).toContain("url IS NOT NULL");
  });

  it("dedupes by id", () => {
    expect(sql).toContain("ROW_NUMBER()");
  });

  it("emits day + url columns", () => {
    expect(sql).toMatch(/AS day,\s*url/);
  });
});
