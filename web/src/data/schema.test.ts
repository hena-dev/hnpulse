import { describe, expect, it } from "vitest";
import { KpisJsonSchema, MetaJsonSchema } from "./schema.ts";
import { METRIC_KEYS } from "./types.ts";

const goodKpis = {
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  days: ["2024-05-04", "2024-05-05"],
  metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, [1, 2]])),
  topDomainsByDay: [
    { date: "2024-05-04", domains: [] },
    { date: "2024-05-05", domains: [] },
  ],
};

describe("KpisJsonSchema (web)", () => {
  it("accepts a valid object", () => {
    expect(KpisJsonSchema.parse(goodKpis)).toMatchObject({ schemaVersion: 1 });
  });
  it("rejects schemaVersion ≠ 1", () => {
    expect(() => KpisJsonSchema.parse({ ...goodKpis, schemaVersion: 2 })).toThrow();
  });
  it("rejects mismatched series length", () => {
    expect(() => KpisJsonSchema.parse({ ...goodKpis, days: ["2024-05-04"] })).toThrow();
  });
});

describe("MetaJsonSchema (web)", () => {
  it("accepts a valid object", () => {
    expect(
      MetaJsonSchema.parse({
        schemaVersion: 1,
        lastUpdated: "2024-05-04T14:00:00Z",
        dataAsOf: "2024-05-03",
        windowStart: "2024-05-04",
        windowEnd: "2024-05-03",
        kpisFile: "/data/kpis.abcdef0.json",
        buildSha: "abc",
        pipelineVersion: "1.0.0",
      }),
    ).toMatchObject({ schemaVersion: 1 });
  });

  it("rejects a topDomainsByDay length mismatch", () => {
    expect(() =>
      KpisJsonSchema.parse({
        ...goodKpis,
        topDomainsByDay: [{ date: "2024-05-04", domains: [] }],
      }),
    ).toThrow();
  });

  it("rejects when a metric series has the wrong length (independent of inner schema)", () => {
    const bad = {
      ...goodKpis,
      metrics: {
        ...goodKpis.metrics,
        stories: [1], // length mismatch with days (length 2)
      },
    };
    expect(() => KpisJsonSchema.parse(bad)).toThrow();
  });
});
