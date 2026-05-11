import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJsonExportSql, buildNdjsonToParquetSql } from "../duckdb/sql-templates.ts";
import { buildDailyMetricsSql } from "./sql.ts";

const runDuckdb = (sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = execFile("duckdb", ["-c", sql], (error, _stdout, stderr) => {
      if (error !== null) reject(new Error(stderr || error.message));
      else resolve();
    });
    proc.stdin?.end();
  });

const hasDuckdb = (): Promise<boolean> =>
  new Promise((resolve) => {
    execFile("duckdb", ["--version"], (error) => resolve(error === null));
  });

const duckdbAvailable = await hasDuckdb();

describe.skipIf(!duckdbAvailable)("buildDailyMetricsSql DuckDB execution", () => {
  it("runs against parquet rows containing the Hacker News by column", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hnpulse-sql-"));
    try {
      const ndjsonPath = join(dir, "items.ndjson");
      const parquetPath = join(dir, "items-2026-05-01.parquet");
      const outPath = join(dir, "out.json");
      const rows = [
        {
          id: 1,
          type: "story",
          by: "alice",
          title: "Show HN: Demo",
          url: "https://example.com/a",
          score: 150,
          timestamp: "2026-05-01T01:00:00Z",
          dead: false,
          deleted: false,
        },
        {
          id: 2,
          type: "comment",
          by: "bob",
          title: null,
          url: null,
          score: null,
          timestamp: "2026-05-01T02:00:00Z",
          dead: false,
          deleted: false,
        },
      ];
      await writeFile(ndjsonPath, `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");
      await runDuckdb(buildNdjsonToParquetSql({ ndjsonPath, parquetPath }));
      await runDuckdb(
        buildJsonExportSql({
          innerSql: buildDailyMetricsSql({
            parquetGlob: parquetPath,
            windowStart: "2026-05-01",
            windowEnd: "2026-05-01",
          }),
          outputPath: outPath,
        }),
      );
      const [daily] = JSON.parse(await readFile(outPath, "utf8")) as Array<Record<string, number>>;
      expect(daily?.stories).toBe(1);
      expect(daily?.comments).toBe(1);
      expect(daily?.active_submitters).toBe(1);
      expect(daily?.active_commenters).toBe(1);
      expect(daily?.success_rate_gte100).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
