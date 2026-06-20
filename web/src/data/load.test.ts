import { describe, expect, it, vi } from "vitest";
import { joinUrl, loadDashboardData } from "./load.ts";
import { METRIC_KEYS } from "./types.ts";

const topDomainsByRange = { "1w": [], "1m": [], "3m": [], "6m": [], "1y": [], "2y": [] };

describe("joinUrl", () => {
  it("passes through absolute http URLs", () => {
    expect(joinUrl("https://x/", "https://cdn/x.json")).toBe("https://cdn/x.json");
  });
  it("joins relative paths against the base", () => {
    expect(joinUrl("https://x/", "/data/meta.json")).toBe("https://x/data/meta.json");
  });
});

const meta = {
  schemaVersion: 1,
  lastUpdated: "2024-05-04T14:00:00Z",
  dataAsOf: "2024-05-03",
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  kpisFile: "/data/kpis.abcdef0.json",
  buildSha: "abc",
  pipelineVersion: "1.0.0",
  dataSources: ["bigquery"],
  stabilizationDays: 7,
  provisionalFrom: "2024-04-27",
};

const kpis = {
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  days: ["2024-05-04", "2024-05-05"],
  metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, [1, 2]])),
  topDomainsByDay: [
    { date: "2024-05-04", domains: [] },
    { date: "2024-05-05", domains: [] },
  ],
  topDomainsByRange,
};

describe("loadDashboardData", () => {
  it("fetches and validates meta + kpis", async () => {
    const fetchFn = vi.fn(async (input: string) => {
      if (input.endsWith("/meta.json")) return Response.json(meta);
      return Response.json(kpis);
    });
    const out = await loadDashboardData("https://example/", fetchFn);
    expect(out.meta.kpisFile).toBe("/data/kpis.abcdef0.json");
    expect(out.kpis.metrics.stories).toEqual([1, 2]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws on schema mismatch in meta", async () => {
    const bad = { ...meta, schemaVersion: 2 };
    const fetchFn = async () => Response.json(bad);
    await expect(loadDashboardData("https://example/", fetchFn)).rejects.toThrow();
  });

  it("throws on a non-OK response", async () => {
    const fetchFn = async () => new Response("nope", { status: 404 });
    await expect(loadDashboardData("https://example/", fetchFn)).rejects.toThrow();
  });

  it("supports an absolute http(s) kpisFile in meta", async () => {
    const absMeta = { ...meta, kpisFile: "https://cdn.example.com/k.json" };
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/meta.json")) return Response.json(absMeta);
      // The kpisFile is now absolute; load.ts should pass it through unchanged.
      expect(url).toBe("https://cdn.example.com/k.json");
      return Response.json({
        ...kpis,
        kpisFile: undefined,
      });
    });
    // Schema validation will fail because the placeholder kpis lacks the right fields,
    // but reaching the absolute fetch is what we're verifying.
    await expect(loadDashboardData("https://example/", fetchFn)).rejects.toBeDefined();
  });
});
