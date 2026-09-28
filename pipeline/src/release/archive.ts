import { parseParquetAssetDate } from "./policy.ts";
import type { ReleaseAsset, ReleaseManager } from "./types.ts";

export const ARCHIVE_START = "2023-01-01";

/** Legacy assets are read in place; new writes are partitioned by UTC year. */
export const createArchiveManager = (
  managerForTag: (tag: string) => ReleaseManager,
  lastYear: number,
  beforeWrite: () => Promise<void> = async () => {},
): ReleaseManager => {
  const tags = [
    "data-snapshot",
    ...Array.from({ length: Math.max(0, lastYear - 2022) }, (_, i) => `data-${2023 + i}`),
  ];
  const managers = new Map(tags.map((tag) => [tag, managerForTag(tag)]));
  let listing: Promise<Map<string, { asset: ReleaseAsset; tags: string[] }>> | undefined;
  const list = () => {
    listing ??= Promise.all(tags.map((tag) => managers.get(tag)?.listAssets() ?? []))
      .then((groups) => {
        const out = new Map<string, { asset: ReleaseAsset; tags: string[] }>();
        groups.forEach((assets, i) => {
          for (const asset of assets) {
            const tag = tags[i] as string;
            const previous = out.get(asset.name);
            out.set(asset.name, { asset, tags: [...(previous?.tags ?? []), tag] });
          }
        });
        return out;
      })
      .catch((error: unknown) => {
        listing = undefined;
        throw error;
      });
    return listing;
  };
  return {
    listAssets: async () => [...(await list()).values()].map(({ asset }) => asset),
    async downloadAsset(name, path) {
      const found = (await list()).get(name);
      if (found === undefined) throw new Error(`asset not found: ${name}`);
      // A yearly copy wins when recovering from an interrupted legacy migration.
      const tag = found.tags[found.tags.length - 1] as string;
      await managers.get(tag)?.downloadAsset(name, path);
    },
    async uploadAsset(name, path, contentType) {
      const day = parseParquetAssetDate(name);
      if (day === null || day < ARCHIVE_START) throw new Error(`Invalid archive asset: ${name}`);
      const tag = `data-${day.slice(0, 4)}`;
      const manager = managers.get(tag);
      if (manager === undefined) throw new Error(`Archive year outside configured range: ${day}`);
      await beforeWrite();
      const asset = await manager.uploadAsset(name, path, contentType);
      listing = undefined;
      return asset;
    },
    async deleteAsset(name) {
      const found = (await list()).get(name);
      for (const tag of found?.tags ?? []) {
        await beforeWrite();
        await managers.get(tag)?.deleteAsset(name);
        listing = undefined;
      }
    },
  };
};

/** Covers GitHub's hourly write budget, including replacements and release creation. */
export const paceArchiveWrites = (intervalMs = 9_000): (() => Promise<void>) => {
  let next = 0;
  return async () => {
    const wait = Math.max(0, next - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    next = Date.now() + intervalMs;
  };
};
