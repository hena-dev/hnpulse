import { describe, expect, it } from "vitest";
import { MetaJsonSchema } from "./meta.ts";

const ok = {
  schemaVersion: 1,
  lastUpdated: "2026-05-04T14:03:14Z",
  dataAsOf: "2026-05-03",
  windowStart: "2024-05-04",
  windowEnd: "2026-05-03",
  kpisFile: "/data/kpis.f4a9c1e.json",
  buildSha: "f4a9c1e",
  pipelineVersion: "1.0.0",
  dataSources: ["bigquery", "hacker-news-api"],
  stabilizationDays: 7,
  provisionalFrom: "2026-04-27",
};

describe("MetaJsonSchema", () => {
  it("parses a valid meta object", () => {
    expect(MetaJsonSchema.parse(ok)).toMatchObject({ schemaVersion: 1, buildSha: "f4a9c1e" });
  });

  it("rejects bad lastUpdated format", () => {
    expect(() => MetaJsonSchema.parse({ ...ok, lastUpdated: "yesterday" })).toThrow();
  });

  it("requires kpisFile to start with /data/ and end .json", () => {
    expect(() => MetaJsonSchema.parse({ ...ok, kpisFile: "kpis.json" })).toThrow();
    expect(() => MetaJsonSchema.parse({ ...ok, kpisFile: "/data/kpis.x" })).toThrow();
  });

  it("rejects empty buildSha", () => {
    expect(() => MetaJsonSchema.parse({ ...ok, buildSha: "" })).toThrow();
  });

  it("requires source and stabilization metadata", () => {
    expect(() => MetaJsonSchema.parse({ ...ok, dataSources: [] })).toThrow();
    expect(() => MetaJsonSchema.parse({ ...ok, stabilizationDays: 0 })).toThrow();
    expect(() => MetaJsonSchema.parse({ ...ok, provisionalFrom: "bad" })).toThrow();
  });
});
