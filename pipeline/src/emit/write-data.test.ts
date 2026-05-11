import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { KpisJson } from "../schema/kpis.ts";
import { METRIC_KEYS } from "../schema/metrics.ts";
import { writeData } from "./write-data.ts";

const makeKpis = (): KpisJson => ({
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  days: ["2024-05-04", "2024-05-05"],
  metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, [1, 2]])) as KpisJson["metrics"],
  topDomainsByDay: [
    { date: "2024-05-04", domains: [] },
    { date: "2024-05-05", domains: [] },
  ],
  topDomainsByRange: { "1w": [], "1m": [], "3m": [], "6m": [], "1y": [], "2y": [] },
});

describe("writeData", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hnpulse-emit-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes hashed kpis.<sha>.json + kpis-current.json + meta.json", async () => {
    const result = await writeData({
      outDir: dir,
      kpis: makeKpis(),
      buildSha: "abcd123",
      pipelineVersion: "1.0.0",
      now: new Date("2024-05-06T14:00:00Z"),
    });
    const files = (await readdir(dir)).sort();
    expect(files).toContain("meta.json");
    expect(files).toContain("kpis-current.json");
    expect(files.some((f) => f.match(/^kpis\.[a-f0-9]{7}\.json$/))).toBe(true);
    expect(result.kpisFile).toMatch(/^\/data\/kpis\.[a-f0-9]{7}\.json$/);
  });

  it("kpis-current.json mirrors the hashed file content", async () => {
    await writeData({
      outDir: dir,
      kpis: makeKpis(),
      buildSha: "abc",
      pipelineVersion: "1.0.0",
      now: new Date(),
    });
    const current = await readFile(join(dir, "kpis-current.json"), "utf8");
    const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8")) as { kpisFile: string };
    const hashed = await readFile(join(dir, meta.kpisFile.replace(/^\/data\//, "")), "utf8");
    expect(current).toBe(hashed);
  });

  it("meta.json validates and points at the hashed file", async () => {
    await writeData({
      outDir: dir,
      kpis: makeKpis(),
      buildSha: "xyz",
      pipelineVersion: "9.9.9",
      now: new Date("2024-05-06T14:00:00Z"),
    });
    const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8")) as {
      buildSha: string;
      kpisFile: string;
    };
    expect(meta.buildSha).toBe("xyz");
    expect(meta.kpisFile).toMatch(/^\/data\/kpis\.[a-f0-9]{7}\.json$/);
  });
});
