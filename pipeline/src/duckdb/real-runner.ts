import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildJsonExportSql } from "./sql-templates.ts";
import type { DuckdbRunner } from "./types.ts";

const runDuckdb = (sql: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn("duckdb", ["-c", sql], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`duckdb exit ${code}: ${stderr}`));
    });
  });

export const createRealDuckdbRunner = (): DuckdbRunner => ({
  async execute(sql: string) {
    return runDuckdb(sql);
  },
  async queryJson<T = Record<string, unknown>>(sql: string): Promise<readonly T[]> {
    const dir = await mkdtemp(join(tmpdir(), "hnpulse-duck-"));
    const out = join(dir, "out.json");
    try {
      await runDuckdb(buildJsonExportSql({ innerSql: sql, outputPath: out }));
      const txt = await readFile(out, "utf8");
      const parsed = JSON.parse(txt) as readonly T[];
      return parsed;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
