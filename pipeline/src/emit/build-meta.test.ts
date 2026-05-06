import { describe, expect, it } from "vitest";
import type { KpisJson } from "../schema/kpis.ts";
import { METRIC_KEYS } from "../schema/metrics.ts";
import { buildMeta } from "./build-meta.ts";

const sampleKpis: KpisJson = {
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  days: ["2024-05-04", "2024-05-05"],
  metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, [1, 2]])) as KpisJson["metrics"],
  topDomainsByDay: [
    { date: "2024-05-04", domains: [] },
    { date: "2024-05-05", domains: [] },
  ],
};

describe("buildMeta", () => {
  it("derives windowStart/windowEnd/dataAsOf from kpis", () => {
    const m = buildMeta({
      kpis: sampleKpis,
      kpisFile: "/data/kpis.abcdef0.json",
      buildSha: "deadbee",
      pipelineVersion: "1.2.3",
      lastUpdated: new Date("2024-05-06T14:00:00Z"),
    });
    expect(m.windowStart).toBe("2024-05-04");
    expect(m.windowEnd).toBe("2024-05-05");
    expect(m.dataAsOf).toBe("2024-05-05");
    expect(m.lastUpdated).toBe("2024-05-06T14:00:00.000Z");
    expect(m.kpisFile).toBe("/data/kpis.abcdef0.json");
    expect(m.buildSha).toBe("deadbee");
    expect(m.pipelineVersion).toBe("1.2.3");
    expect(m.schemaVersion).toBe(1);
  });

  it("validates against MetaJsonSchema (rejects bad kpisFile)", () => {
    expect(() =>
      buildMeta({
        kpis: sampleKpis,
        kpisFile: "kpis.json",
        buildSha: "x",
        pipelineVersion: "1",
        lastUpdated: new Date(),
      }),
    ).toThrow();
  });
});
