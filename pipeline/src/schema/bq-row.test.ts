import { describe, expect, it } from "vitest";
import { BqRowSchema, ItemTypeSchema } from "./bq-row.ts";

const baseRow = {
  id: 12345,
  type: "story",
  by: "alice",
  title: "Hello HN",
  url: "https://example.com/post",
  text: null,
  score: 42,
  time: 1_700_000_000,
  timestamp: "2023-11-14T22:13:20.000Z",
  parent: null,
  descendants: 7,
  ranking: null,
  dead: false,
  deleted: false,
};

describe("ItemTypeSchema", () => {
  it.each(["story", "comment", "job", "poll", "pollopt"] as const)("accepts %s", (t) => {
    expect(ItemTypeSchema.parse(t)).toBe(t);
  });
  it("rejects unknown types", () => {
    expect(() => ItemTypeSchema.parse("rant")).toThrow();
  });
});

describe("BqRowSchema", () => {
  it("parses a complete row", () => {
    expect(BqRowSchema.parse(baseRow)).toMatchObject({ id: 12345, type: "story" });
  });

  it("accepts null for optional text/title/url/by/parent/descendants/ranking", () => {
    expect(() =>
      BqRowSchema.parse({
        ...baseRow,
        title: null,
        url: null,
        text: null,
        by: null,
        parent: null,
        descendants: null,
        ranking: null,
      }),
    ).not.toThrow();
  });

  it("rejects rows missing the id", () => {
    const { id: _id, ...rest } = baseRow;
    expect(() => BqRowSchema.parse(rest)).toThrow();
  });

  it("coerces timestamp strings to Date via .timestamp", () => {
    const parsed = BqRowSchema.parse(baseRow);
    expect(parsed.timestamp).toBe("2023-11-14T22:13:20.000Z");
  });
});
