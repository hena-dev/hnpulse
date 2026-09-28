import { afterEach, describe, expect, it, vi } from "vitest";
import { bounds, deferred, snapshotFixture } from "./snapshot.test.fixture.ts";
import { loadSnapshot, prepareSnapshot, SnapshotSchema } from "./snapshot.ts";

afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown) => new Response(JSON.stringify(body));
describe("snapshot loading", () => {
  it("validates all metrics, contiguous UTC days and exact payload shape", () => {
    const valid = snapshotFixture();
    expect(SnapshotSchema.parse(valid)).toEqual(valid);
    for (const invalid of [
      { ...valid, metrics: { ...valid.metrics, stories: [] } },
      { ...valid, metrics: { ...valid.metrics, deadFlaggedTotal: undefined } },
      { ...valid, metrics: { ...valid.metrics, comments: [Infinity] } },
      { ...valid, windowStart: "2025-01-11" },
      { ...valid, windowStart: "2025-02-30" },
      { ...valid, lastUpdated: "yesterday" },
      { ...valid, days: [valid.windowEnd] },
      { ...valid, topDomainsByDay: [] },
      { ...valid, topDomainsByRange: {} },
    ])
      expect(SnapshotSchema.safeParse(invalid).success).toBe(false);
    const data = prepareSnapshot(valid).ranges["1w"];
    expect(data.detailSeries.stories[0]).toMatchObject({ date: valid.windowEnd, value: 42 });
    expect(data.topDomain?.name).toBe("snapshot.example");
  });
  it("deduplicates inflight requests and permanently caches only final snapshots", async () => {
    const request = deferred<Response>();
    const fetcher = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetcher);
    const first = loadSnapshot("2025-01-02", bounds);
    expect(loadSnapshot("2025-01-02", bounds)).toBe(first);
    request.resolve(response(snapshotFixture("2025-01-02")));
    const data = await first;
    expect(await loadSnapshot("2025-01-02", bounds)).toBe(data);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/data/snapshots/2025-01-02.json", {
      cache: "default",
    });
  });
  it("revalidates mutable snapshots and switches to the final path when published", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-11", "provisional", 2)))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-11", "provisional", 3)))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-11", "final", 4)));
    vi.stubGlobal("fetch", fetcher);
    expect((await loadSnapshot("2025-01-11", bounds)).ranges["1w"].summaries.stories.value).toBe(2);
    expect((await loadSnapshot("2025-01-11", bounds)).ranges["1w"].summaries.stories.value).toBe(3);
    expect(fetcher).toHaveBeenNthCalledWith(2, "/data/provisional/2025-01-11.json", {
      cache: "no-store",
    });
    expect(
      (await loadSnapshot("2025-01-11", { ...bounds, finalThrough: "2025-01-11" })).snapshot.status,
    ).toBe("final");
    expect(fetcher).toHaveBeenLastCalledWith("/data/snapshots/2025-01-11.json", {
      cache: "default",
    });
  });
  it("rejects HTTP errors and wrong date/status, and allows retry", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-04")))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-03", "provisional")))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-03")));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadSnapshot("2025-01-03", bounds)).rejects.toThrow("HTTP 404");
    await expect(loadSnapshot("2025-01-03", bounds)).rejects.toThrow("date/status");
    await expect(loadSnapshot("2025-01-03", bounds)).rejects.toThrow("date/status");
    await expect(loadSnapshot("2025-01-03", bounds)).resolves.toHaveProperty(
      "snapshot.status",
      "final",
    );
  });
  it("falls back from provisional 404 to final and caches under the final path", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-14")));
    vi.stubGlobal("fetch", fetcher);
    const result = await loadSnapshot("2025-01-14", bounds);
    expect(result.snapshot.status).toBe("final");
    expect(fetcher).toHaveBeenNthCalledWith(1, "/data/provisional/2025-01-14.json", {
      cache: "no-store",
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "/data/snapshots/2025-01-14.json", {
      cache: "default",
    });
    expect(await loadSnapshot("2025-01-14", bounds)).toBe(result);
    expect(await loadSnapshot("2025-01-14", { ...bounds, finalThrough: "2025-01-14" })).toBe(
      result,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("never falls back on server errors and validates fallback status/date", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-15", "provisional")))
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(response(snapshotFixture("2025-01-16")));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadSnapshot("2025-01-15", bounds)).rejects.toThrow("HTTP 500");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(loadSnapshot("2025-01-15", bounds)).rejects.toThrow("date/status");
    await expect(loadSnapshot("2025-01-15", bounds)).rejects.toThrow("date/status");
  });
});
