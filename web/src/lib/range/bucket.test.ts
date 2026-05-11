import { describe, expect, it } from "vitest";
import { bucketForRange, bucketSeries } from "./bucket.ts";

describe("bucketForRange", () => {
  it("daily for 1w/1m/3m", () => {
    expect(bucketForRange("1w")).toBe("daily");
    expect(bucketForRange("1m")).toBe("daily");
    expect(bucketForRange("3m")).toBe("daily");
  });
  it("weekly for 6m/1y", () => {
    expect(bucketForRange("6m")).toBe("weekly");
    expect(bucketForRange("1y")).toBe("weekly");
  });
  it("monthly for 2y", () => {
    expect(bucketForRange("2y")).toBe("monthly");
  });
});

describe("bucketSeries", () => {
  it("returns identity for 'daily' bucket", () => {
    const days = ["2024-01-01", "2024-01-02"];
    const out = bucketSeries(days, [1, 2], "daily");
    expect(out).toEqual([
      { date: "2024-01-01", value: 1 },
      { date: "2024-01-02", value: 2 },
    ]);
  });

  it("groups by ISO week start (Mon) for 'weekly'", () => {
    // 2024-01-01 is Mon, so two full weeks
    const days = ["2024-01-01", "2024-01-02", "2024-01-08"];
    const out = bucketSeries(days, [1, 2, 3], "weekly");
    expect(out).toEqual([
      { date: "2024-01-01", value: 3 },
      { date: "2024-01-08", value: 3 },
    ]);
  });

  it("groups by month for 'monthly'", () => {
    const days = ["2024-01-31", "2024-02-01", "2024-02-15"];
    const out = bucketSeries(days, [1, 2, 3], "monthly");
    expect(out).toEqual([
      { date: "2024-01-01", value: 1 },
      { date: "2024-02-01", value: 5 },
    ]);
  });

  it("can average grouped values for non-additive metrics", () => {
    const days = ["2024-01-01", "2024-01-02", "2024-01-08"];
    const out = bucketSeries(days, [10, 20, 40], "weekly", "mean");
    expect(out).toEqual([
      { date: "2024-01-01", value: 15 },
      { date: "2024-01-08", value: 40 },
    ]);
  });

  it("treats Sunday correctly (week starts Mon, so Sun belongs to prior week)", () => {
    // 2024-01-07 is Sun, week start is 2024-01-01
    const out = bucketSeries(["2024-01-07"], [9], "weekly");
    expect(out).toEqual([{ date: "2024-01-01", value: 9 }]);
  });

  it("ignores undefined entries when value array is shorter than days", () => {
    const out = bucketSeries(["2024-01-01", "2024-01-02"], [1], "weekly");
    expect(out[0]?.value).toBe(1);
  });
});
