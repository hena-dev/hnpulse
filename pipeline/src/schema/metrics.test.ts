import { describe, expect, it } from "vitest";
import { METRIC_KEYS, MetricKeySchema, MetricSeriesSchema } from "./metrics.ts";

describe("METRIC_KEYS", () => {
  it("contains all 12 KPI keys from §5", () => {
    expect(METRIC_KEYS).toEqual([
      "stories",
      "comments",
      "activeCommenters",
      "activeSubmitters",
      "medianScore",
      "p90Score",
      "commentsPerStory",
      "successRateGte100",
      "showHn",
      "askHn",
      "jobs",
      "deadFlaggedRatio",
    ]);
  });
});

describe("MetricKeySchema", () => {
  it("accepts every defined key", () => {
    for (const key of METRIC_KEYS) expect(MetricKeySchema.parse(key)).toBe(key);
  });
  it("rejects unknown keys", () => {
    expect(() => MetricKeySchema.parse("nope")).toThrow();
  });
});

describe("MetricSeriesSchema", () => {
  it("requires every metric key to be present", () => {
    const partial = { stories: [1, 2, 3] };
    expect(() => MetricSeriesSchema.parse(partial)).toThrow();
  });

  it("accepts a complete numeric series record", () => {
    const full = Object.fromEntries(METRIC_KEYS.map((k) => [k, [1.0]]));
    const parsed = MetricSeriesSchema.parse(full);
    expect(parsed.stories).toEqual([1]);
  });

  it("rejects non-finite numbers in a series", () => {
    const bad = Object.fromEntries(METRIC_KEYS.map((k) => [k, [Number.NaN]]));
    expect(() => MetricSeriesSchema.parse(bad)).toThrow();
  });
});
