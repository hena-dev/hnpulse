import { describe, expect, it } from "vitest";
import { hnItemToBqRow } from "./map.ts";

describe("hnItemToBqRow", () => {
  it("maps official HN API item fields to the BigQuery row shape", () => {
    const row = hnItemToBqRow({
      id: 123,
      type: "story",
      by: "alice",
      title: "Show HN: Demo",
      url: "https://example.com",
      text: "body",
      score: 42,
      time: 1_778_457_600,
      parent: 100,
      descendants: 3,
      dead: true,
      deleted: false,
    });

    expect(row).toEqual({
      id: 123,
      type: "story",
      by: "alice",
      title: "Show HN: Demo",
      url: "https://example.com",
      text: "body",
      score: 42,
      time: 1_778_457_600,
      timestamp: "2026-05-11T00:00:00.000Z",
      parent: 100,
      descendants: 3,
      ranking: null,
      dead: true,
      deleted: false,
    });
  });

  it("defaults optional fields to null/false and rejects unplaceable items", () => {
    expect(hnItemToBqRow({ id: 1, type: "comment", time: 1 })).toMatchObject({
      by: null,
      title: null,
      score: null,
      dead: false,
      deleted: false,
    });
    expect(hnItemToBqRow(null)).toBeNull();
    expect(hnItemToBqRow({ id: 2, type: "story" })).toBeNull();
    expect(hnItemToBqRow({ id: 3, type: "unknown", time: 1 })).toBeNull();
  });
});
