import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bounds, deferred, snapshotFixture } from "../data/snapshot.test.fixture.ts";
import { prepareSnapshot } from "../data/snapshot.ts";
import { useSnapshot } from "./use-snapshot.ts";

const load = vi.hoisted(() => vi.fn());
vi.mock("../data/snapshot.ts", async (actual) => ({
  ...(await actual<object>()),
  loadSnapshot: load,
}));
beforeEach(() => load.mockReset());
describe("useSnapshot", () => {
  it("does not load latest or unavailable history", () => {
    renderHook(() => useSnapshot(null, bounds));
    renderHook(() => useSnapshot("2025-01-01"));
    expect(load).not.toHaveBeenCalled();
  });
  it("isolates out-of-order completion and never reuses provisional state on revisiting", async () => {
    const old = deferred<ReturnType<typeof prepareSnapshot>>();
    const next = deferred<ReturnType<typeof prepareSnapshot>>();
    const repeat = deferred<ReturnType<typeof prepareSnapshot>>();
    load
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise)
      .mockReturnValueOnce(repeat.promise);
    const { result, rerender } = renderHook(({ date }) => useSnapshot(date, bounds), {
      initialProps: { date: "2025-01-12" },
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ date: "2025-01-13" });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () =>
      next.resolve(prepareSnapshot(snapshotFixture("2025-01-13", "provisional"))),
    );
    await act(async () =>
      old.resolve(prepareSnapshot(snapshotFixture("2025-01-12", "provisional"))),
    );
    expect(result.current.data?.snapshot.windowEnd).toBe("2025-01-13");
    rerender({ date: "2025-01-12" });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    await act(async () =>
      repeat.resolve(prepareSnapshot(snapshotFixture("2025-01-12", "provisional", 9))),
    );
    expect(result.current.data?.ranges["1w"].summaries.stories.value).toBe(9);
  });
  it("ignores stale rejection and offers retry for the current failure", async () => {
    const old = deferred<ReturnType<typeof prepareSnapshot>>();
    load
      .mockReturnValueOnce(old.promise)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(prepareSnapshot(snapshotFixture()));
    const { result, rerender } = renderHook(({ date }) => useSnapshot(date, bounds), {
      initialProps: { date: "2025-01-09" },
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ date: "2025-01-10" });
    await waitFor(() => expect(result.current.error).toBe(true));
    await act(async () => old.reject(new Error("stale")));
    act(() => result.current.retry());
    expect(result.current.error).toBe(false);
    await waitFor(() => expect(result.current.data?.snapshot.windowEnd).toBe("2025-01-10"));
  });
  it("discards state while returning to latest and after unmount", async () => {
    const request = deferred<ReturnType<typeof prepareSnapshot>>();
    load.mockReturnValue(request.promise);
    const { result, rerender, unmount } = renderHook(
      ({ date }: { date: string | null }) => useSnapshot(date, bounds),
      { initialProps: { date: "2025-01-10" as string | null } },
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ date: null });
    expect(result.current.data).toBeUndefined();
    unmount();
    await act(async () => request.resolve(prepareSnapshot(snapshotFixture())));
  });
});
