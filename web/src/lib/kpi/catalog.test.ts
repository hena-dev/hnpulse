import { describe, expect, it } from "vitest";
import { KPI_CATALOG, primaryKpis, secondaryKpis } from "./catalog.ts";

describe("KPI_CATALOG", () => {
  it("has exactly 12 entries (\u00a75)", () => {
    expect(KPI_CATALOG).toHaveLength(12);
  });

  it("includes one dual card combining median + p90 (\u00a75 #5)", () => {
    const dual = KPI_CATALOG.filter((e) => e.kind === "dual");
    expect(dual).toHaveLength(1);
    expect(dual[0]?.id).toBe("score");
  });

  it("includes one top-domain card (\u00a75 #8)", () => {
    const top = KPI_CATALOG.filter((e) => e.kind === "topDomain");
    expect(top).toHaveLength(1);
    expect(top[0]?.id).toBe("topDomain");
  });

  it("primary + secondary partitions cleanly to 11 + 1", () => {
    expect(primaryKpis).toHaveLength(11);
    expect(secondaryKpis).toHaveLength(1);
    expect(secondaryKpis[0]?.id).toBe("deadFlaggedRatio");
  });

  it("every single-card entry has a metric key + format", () => {
    for (const e of KPI_CATALOG) {
      if (e.kind !== "single") continue;
      expect(typeof e.key).toBe("string");
      expect(["count", "ratio", "percent"]).toContain(e.format);
    }
  });
});
