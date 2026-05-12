import { describe, expect, it, vi } from "vitest";
import { fetchHnApiRows } from "./fetch.ts";
import type { HnApiClient } from "./types.ts";

describe("fetchHnApiRows", () => {
  it("walks backward from maxitem, skips today, and stops before the requested range", async () => {
    const item = vi.fn(async (id: number) => {
      const items: Record<number, unknown> = {
        5: { id: 5, type: "story", time: Date.parse("2026-05-12T01:00:00Z") / 1000 },
        4: { id: 4, type: "story", time: Date.parse("2026-05-11T01:00:00Z") / 1000 },
        3: { id: 3, type: "comment", time: Date.parse("2026-05-10T02:00:00Z") / 1000 },
        2: { id: 2, type: "story", time: Date.parse("2026-05-09T23:59:59Z") / 1000 },
        1: { id: 1, type: "story", time: Date.parse("2026-05-01T00:00:00Z") / 1000 },
      };
      return items[id] ?? null;
    });
    const client: HnApiClient = { maxItem: vi.fn(async () => 5), item };

    const rows = [];
    for await (const row of fetchHnApiRows({
      client,
      since: new Date("2026-05-10T00:00:00Z"),
      until: new Date("2026-05-12T00:00:00Z"),
      batchSize: 2,
    })) {
      rows.push(row);
    }

    expect(rows.map((r) => r.id)).toEqual([4, 3]);
    expect(item).not.toHaveBeenCalledWith(1);
  });
});
