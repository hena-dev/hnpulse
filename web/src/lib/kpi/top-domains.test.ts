import { describe, expect, it } from "vitest";
import type { TopDomainsDay } from "../../data/types.ts";
import { topDomainsForRange } from "./top-domains.ts";

const day = (date: string, ...entries: [string, number][]): TopDomainsDay => ({
  date,
  domains: entries.map(([name, stories]) => ({
    name,
    stories,
    share: stories / entries.reduce((a, [, n]) => a + n, 0),
  })),
});

describe("topDomainsForRange", () => {
  it("aggregates story counts across the range and renormalises shares", () => {
    const days: TopDomainsDay[] = [
      day("2024-01-01", ["github.com", 10], ["nytimes.com", 5]),
      day("2024-01-02", ["github.com", 20], ["medium.com", 5]),
    ];
    const out = topDomainsForRange(days, 3);
    expect(out[0]).toEqual({ name: "github.com", stories: 30, share: 30 / 40 });
    // ties broken alphabetically
    expect(out[1]?.name).toBe("medium.com");
    expect(out[2]?.name).toBe("nytimes.com");
    expect(out.reduce((a, e) => a + e.share, 0)).toBeCloseTo(40 / 40);
  });

  it("limits output to topN", () => {
    const days: TopDomainsDay[] = [day("2024-01-01", ["a.com", 1], ["b.com", 1], ["c.com", 1])];
    expect(topDomainsForRange(days, 1)).toEqual([{ name: "a.com", stories: 1, share: 1 / 3 }]);
  });

  it("returns [] when no domains in window", () => {
    expect(topDomainsForRange([], 10)).toEqual([]);
  });

  it("uses share=0 when total story count across the window is 0", () => {
    const days: TopDomainsDay[] = [
      { date: "2024-01-01", domains: [{ name: "ghost.com", stories: 0, share: 0 }] },
    ];
    expect(topDomainsForRange(days, 1)).toEqual([{ name: "ghost.com", stories: 0, share: 0 }]);
  });
});
