import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const repos = {
    createRelease: vi.fn(),
    deleteReleaseAsset: vi.fn(),
    getReleaseByTag: vi.fn(),
    listReleaseAssets: vi.fn(),
    uploadReleaseAsset: vi.fn(),
  };

  return {
    Octokit: vi.fn(() => ({ rest: { repos } })),
    repos,
  };
});

vi.mock("@octokit/rest", () => ({ Octokit: mocks.Octokit }));

import { createRealReleaseManager } from "./real-manager.ts";

const release = { id: 42, upload_url: "https://uploads.example.com/release" };

const asset = (id: number, name: string) => ({
  id,
  name,
  size: 123,
  browser_download_url: `https://downloads.example.com/${name}`,
});

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "hnpulse-real-release-"));
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("parquet")),
  );
  mocks.repos.getReleaseByTag.mockResolvedValue({ data: release });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("createRealReleaseManager", () => {
  it("caches release asset listings across parallel downloads", async () => {
    mocks.repos.listReleaseAssets.mockResolvedValue({
      data: [asset(1, "items-2024-05-04.parquet"), asset(2, "items-2024-05-05.parquet")],
    });
    const releaseManager = createRealReleaseManager({
      owner: "hena-dev",
      repo: "hnpulse",
      token: "t",
    });

    await Promise.all([
      releaseManager.downloadAsset("items-2024-05-04.parquet", join(dir, "one.parquet")),
      releaseManager.downloadAsset("items-2024-05-05.parquet", join(dir, "two.parquet")),
    ]);

    expect(mocks.repos.listReleaseAssets).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached release asset listings after delete", async () => {
    mocks.repos.listReleaseAssets
      .mockResolvedValueOnce({ data: [asset(1, "items-old.parquet")] })
      .mockResolvedValueOnce({ data: [asset(2, "items-new.parquet")] });
    const releaseManager = createRealReleaseManager({
      owner: "hena-dev",
      repo: "hnpulse",
      token: "t",
    });

    await releaseManager.deleteAsset("items-old.parquet");
    const assets = await releaseManager.listAssets();

    expect(mocks.repos.deleteReleaseAsset).toHaveBeenCalledWith({
      owner: "hena-dev",
      repo: "hnpulse",
      asset_id: 1,
    });
    expect(mocks.repos.listReleaseAssets).toHaveBeenCalledTimes(2);
    expect(assets.map((a) => a.name)).toEqual(["items-new.parquet"]);
  });

  it("invalidates cached release asset listings after upload", async () => {
    const localPath = join(dir, "items-new.parquet");
    await writeFile(localPath, "parquet");
    mocks.repos.listReleaseAssets
      .mockResolvedValueOnce({ data: [asset(1, "items-old.parquet")] })
      .mockResolvedValueOnce({ data: [asset(2, "items-new.parquet")] });
    mocks.repos.uploadReleaseAsset.mockResolvedValue({ data: asset(2, "items-new.parquet") });
    const releaseManager = createRealReleaseManager({
      owner: "hena-dev",
      repo: "hnpulse",
      token: "t",
    });

    await releaseManager.listAssets();
    await releaseManager.uploadAsset("items-new.parquet", localPath);
    const assets = await releaseManager.listAssets();

    expect(mocks.repos.uploadReleaseAsset).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "hena-dev", repo: "hnpulse", release_id: 42 }),
    );
    expect(mocks.repos.listReleaseAssets).toHaveBeenCalledTimes(2);
    expect(assets.map((a) => a.name)).toEqual(["items-new.parquet"]);
  });
});
