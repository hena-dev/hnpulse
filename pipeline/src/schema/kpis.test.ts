import { describe, expect, it } from "vitest";
import { KpisJsonSchema, TopDomainEntrySchema } from "./kpis.ts";
import { METRIC_KEYS } from "./metrics.ts";

const minimalKpis = {
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-05",
  days: ["2024-05-04", "2024-05-05"],
  metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, [1, 2]])),
  topDomainsByDay: [
    {
      date: "2024-05-04",
      domains: [{ name: "github.com", stories: 10, share: 0.1 }],
    },
    {
      date: "2024-05-05",
      domains: [{ name: "github.com", stories: 12, share: 0.12 }],
    },
  ],
};

describe("TopDomainEntrySchema", () => {
  it("accepts a valid entry", () => {
    const v = { name: "github.com", stories: 10, share: 0.1 };
    expect(TopDomainEntrySchema.parse(v)).toEqual(v);
  });

  it("rejects share > 1 or < 0", () => {
    expect(() => TopDomainEntrySchema.parse({ name: "x", stories: 1, share: 1.1 })).toThrow();
    expect(() => TopDomainEntrySchema.parse({ name: "x", stories: 1, share: -0.01 })).toThrow();
  });
});

describe("KpisJsonSchema", () => {
  it("accepts a minimal valid object", () => {
    expect(KpisJsonSchema.parse(minimalKpis)).toMatchObject({ schemaVersion: 1 });
  });

  it("rejects mismatched series length vs days length", () => {
    const bad = { ...minimalKpis, days: ["2024-05-04"] };
    expect(() => KpisJsonSchema.parse(bad)).toThrow();
  });

  it("rejects schemaVersion ≠ 1", () => {
    expect(() => KpisJsonSchema.parse({ ...minimalKpis, schemaVersion: 2 })).toThrow();
  });

  it("rejects when topDomainsByDay length ≠ days length", () => {
    const bad = { ...minimalKpis, topDomainsByDay: [minimalKpis.topDomainsByDay[0]] };
    expect(() => KpisJsonSchema.parse(bad)).toThrow();
  });
});
