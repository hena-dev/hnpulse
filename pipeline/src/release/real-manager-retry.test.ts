import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repos = vi.hoisted(() => ({
  getReleaseByTag: vi.fn(),
  listReleaseAssets: vi.fn(),
  createRelease: vi.fn(),
}));
vi.mock("@octokit/rest", () => ({ Octokit: vi.fn(() => ({ rest: { repos } })) }));

import { createRealReleaseManager } from "./real-manager.ts";

const args = { owner: "hena-dev", repo: "hnpulse", token: "t" };
const unavailable = Object.assign(new Error("upstream connection termination"), { status: 503 });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  repos.getReleaseByTag.mockResolvedValue({ data: { id: 42, upload_url: "url" } });
  repos.listReleaseAssets.mockResolvedValue({ data: [] });
});
afterEach(() => vi.useRealTimers());

describe("GitHub release read retries", () => {
  it("retries page 8 after a 503 without restarting or duplicating pagination", async () => {
    let failed = false;
    repos.listReleaseAssets.mockImplementation(async ({ page }: { page: number }) => {
      if (page === 8 && !failed) {
        failed = true;
        throw unavailable;
      }
      return {
        data: Array.from({ length: page < 8 ? 100 : 1 }, (_, i) => ({
          id: (page - 1) * 100 + i,
          name: `items-${page}-${i}.parquet`,
          size: 123,
          browser_download_url: `https://example.com/${page}/${i}`,
        })),
      };
    });
    const manager = createRealReleaseManager(args);
    const pending = manager.listAssets();
    await vi.advanceTimersByTimeAsync(999);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(8);
    await vi.advanceTimersByTimeAsync(1);
    const assets = await pending;
    expect(assets).toHaveLength(701);
    expect(new Set(assets.map((asset) => asset.name)).size).toBe(701);
    expect(repos.listReleaseAssets.mock.calls.map(([request]) => request.page)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 8,
    ]);
    expect(await manager.listAssets()).toEqual(assets);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(9);
  });

  it.each([500, 502, 503, 504, 599])("retries release lookup on HTTP %i", async (status) => {
    repos.getReleaseByTag.mockRejectedValueOnce({ status });
    const pending = createRealReleaseManager(args).listAssets();
    await vi.runAllTimersAsync();
    expect(await pending).toEqual([]);
    expect(repos.getReleaseByTag).toHaveBeenCalledTimes(2);
    expect(repos.createRelease).not.toHaveBeenCalled();
  });

  it("backs off, stops after three attempts, and clears the failed listing cache", async () => {
    repos.listReleaseAssets.mockRejectedValue(unavailable);
    const manager = createRealReleaseManager(args);
    const assertion = expect(manager.listAssets()).rejects.toBe(unavailable);
    await vi.advanceTimersByTimeAsync(1000);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);

    repos.listReleaseAssets.mockResolvedValue({ data: [] });
    expect(await manager.listAssets()).toEqual([]);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(4);
  });

  it.each([
    401,
    403,
    404,
    422,
    600,
    undefined,
  ])("does not retry listing errors with status %s", async (status) => {
    const error = Object.assign(new Error("request failed"), { status });
    repos.listReleaseAssets.mockRejectedValue(error);
    await expect(createRealReleaseManager(args).listAssets()).rejects.toBe(error);
    expect(repos.listReleaseAssets).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("treats a missing release as empty without retries or creation", async () => {
    repos.getReleaseByTag.mockRejectedValue({ status: 404 });
    expect(await createRealReleaseManager(args).listAssets()).toEqual([]);
    expect(repos.getReleaseByTag).toHaveBeenCalledTimes(1);
    expect(repos.createRelease).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
