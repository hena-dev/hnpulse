import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import type { GitHubReleaseAssetPageItem } from "./paginate.ts";
import { listReleaseAssetsAllPages } from "./paginate.ts";
import type { ReleaseAsset, ReleaseManager } from "./types.ts";

const TAG = "data-snapshot";
const MAX_ATTEMPTS = 3;

interface RealManagerArgs {
  owner: string;
  repo: string;
  token: string;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const downloadAssetOnce = async (url: string, token: string): Promise<ArrayBuffer> => {
  const dl = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: "application/octet-stream" },
  });
  if (!dl.ok) throw new Error(`download failed: ${dl.status}`);
  return dl.arrayBuffer();
};

// GitHub's release-asset CDN occasionally returns transient 5xx errors; retry
// a few times with a short linear backoff before giving up.
const downloadAssetWithRetry = async (url: string, token: string): Promise<ArrayBuffer> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await downloadAssetOnce(url, token);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      await delay(250 * attempt);
    }
  }
  throw lastError;
};

const ensureRelease = async (
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ id: number; uploadUrl: string }> => {
  try {
    const r = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag: TAG });
    return { id: r.data.id, uploadUrl: r.data.upload_url };
  } catch {
    const r = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: TAG,
      name: TAG,
      prerelease: false,
      draft: false,
    });
    return { id: r.data.id, uploadUrl: r.data.upload_url };
  }
};

export const createRealReleaseManager = (args: RealManagerArgs): ReleaseManager => {
  const octokit = new Octokit({ auth: args.token });
  const { owner, repo } = args;
  let cachedAssets: Promise<readonly GitHubReleaseAssetPageItem[]> | undefined;

  const listAssetsForRelease = async () => {
    const { id } = await ensureRelease(octokit, owner, repo);
    return listReleaseAssetsAllPages(async (page, perPage) => {
      const r = await octokit.rest.repos.listReleaseAssets({
        owner,
        repo,
        release_id: id,
        per_page: perPage,
        page,
      });
      return r.data;
    });
  };

  const loadAssetsForRelease = () => {
    if (cachedAssets !== undefined) return cachedAssets;
    let assets: Promise<readonly GitHubReleaseAssetPageItem[]> | undefined;
    assets = listAssetsForRelease().catch((error: unknown) => {
      if (cachedAssets === assets) invalidateAssets();
      throw error;
    });
    cachedAssets = assets;
    return assets;
  };

  const invalidateAssets = () => {
    cachedAssets = undefined;
  };

  return {
    async listAssets() {
      const assets = await loadAssetsForRelease();
      return assets.map((a) => ({
        name: a.name,
        size: a.size,
        url: a.browser_download_url,
      }));
    },
    async uploadAsset(name, localPath) {
      const { id } = await ensureRelease(octokit, owner, repo);
      const fileStat = await stat(localPath);
      const data = createReadStream(localPath) as unknown as string;
      const r = await octokit.rest.repos.uploadReleaseAsset({
        owner,
        repo,
        release_id: id,
        name,
        data,
        headers: { "content-length": fileStat.size, "content-type": "application/octet-stream" },
      });
      invalidateAssets();
      return { name: r.data.name, size: r.data.size, url: r.data.browser_download_url };
    },
    async deleteAsset(name) {
      const asset = (await loadAssetsForRelease()).find((a) => a.name === name);
      if (asset === undefined) return;
      await octokit.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: asset.id });
      invalidateAssets();
    },
    async downloadAsset(name, destPath) {
      const asset = (await loadAssetsForRelease()).find((a) => a.name === name);
      if (asset === undefined) throw new Error(`asset not found: ${name}`);
      const bytes = await downloadAssetWithRetry(asset.browser_download_url, args.token);
      await writeFile(destPath, new Uint8Array(bytes));
    },
  };
};

export const releaseEnvCoords = (): RealManagerArgs => {
  const repo = process.env.GITHUB_REPOSITORY ?? "hena-dev/hnpulse";
  const [owner = "hena-dev", name = "hnpulse"] = repo.split("/");
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
  return { owner, repo: name, token };
};

export type { ReleaseAsset };
