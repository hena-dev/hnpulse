import { describe, expect, it } from "vitest";
import { snapshot } from "../snapshots/_test-fixtures.ts";
import { SnapshotJsonSchema } from "./snapshot.ts";

describe("SnapshotJsonSchema", () => {
  it("accepts the compact contract and rejects expanded/invalid snapshots", () => {
    const value = snapshot();
    expect(SnapshotJsonSchema.parse(value)).toEqual(value);
    for (const changed of [
      { ...value, days: [] },
      { ...value, lastUpdated: "yesterday" },
      { ...value, windowStart: "2026-02-30" },
      { ...value, windowEnd: "2026-01-01" },
      { ...value, metrics: { ...value.metrics, comments: [1] } },
      { ...value, metrics: { ...value.metrics, stories: [1, 0, 1] } },
      { ...value, metrics: { ...value.metrics, jobs: [1, Number.NaN, 1] } },
    ])
      expect(SnapshotJsonSchema.safeParse(changed).success).toBe(false);
  });
});
