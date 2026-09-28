import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repos = vi.hoisted(() => ({
  createRelease: vi.fn(),
  deleteReleaseAsset: vi.fn(),
  getReleaseByTag: vi.fn(),
  listReleaseAssets: vi.fn(),
  uploadReleaseAsset: vi.fn(),
}));
vi.mock("@octokit/rest", () => ({ Octokit: vi.fn(() => ({ rest: { repos } })) }));

import { createRealReleaseManager } from "./real-manager.ts";

const args = { owner: "hena-dev", repo: "hnpulse", token: "t", tag: "data-2023" };
let dir = "";
beforeEach(async () => {
  vi.resetAllMocks();
  dir = await mkdtemp(join(tmpdir(), "hnpulse-release-readonly-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("read-only archive discovery", () => {
  it("does not create a missing release when listing or downloading", async () => {
    repos.getReleaseByTag.mockRejectedValue({ status: 404 });
    const manager = createRealReleaseManager(args);
    expect(await manager.listAssets()).toEqual([]);
    await expect(manager.downloadAsset("missing", "out")).rejects.toThrow("asset not found");
    await manager.deleteAsset("missing");
    expect(repos.createRelease).not.toHaveBeenCalled();
    expect(repos.listReleaseAssets).not.toHaveBeenCalled();
  });
  it("creates only on the first upload into a new year", async () => {
    repos.getReleaseByTag.mockRejectedValue({ status: 404 });
    repos.createRelease.mockResolvedValue({ data: { id: 1, upload_url: "url" } });
    repos.uploadReleaseAsset.mockResolvedValue({
      data: { id: 2, name: "items-2023-01-01.parquet", size: 1, browser_download_url: "url" },
    });
    const manager = createRealReleaseManager(args);
    await manager.listAssets();
    const path = join(dir, "file");
    await writeFile(path, "x");
    await manager.uploadAsset("items-2023-01-01.parquet", path);
    expect(repos.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ tag_name: "data-2023" }),
    );
    expect(await manager.listAssets()).toHaveLength(1);
  });
  it("propagates auth and network failures rather than creating a new release", async () => {
    repos.getReleaseByTag.mockRejectedValue(new Error("offline"));
    const manager = createRealReleaseManager(args);
    await expect(manager.listAssets()).rejects.toThrow("offline");
    await expect(manager.listAssets()).rejects.toThrow("offline");
    expect(repos.createRelease).not.toHaveBeenCalled();
    expect(repos.getReleaseByTag).toHaveBeenCalledTimes(2);
  });
});
