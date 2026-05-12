export interface GitHubReleaseAssetPageItem {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
}

export type LoadReleaseAssetPage = (
  page: number,
  perPage: number,
) => Promise<readonly GitHubReleaseAssetPageItem[]>;

export const listReleaseAssetsAllPages = async (
  loadPage: LoadReleaseAssetPage,
): Promise<readonly GitHubReleaseAssetPageItem[]> => {
  const perPage = 100;
  const out: GitHubReleaseAssetPageItem[] = [];
  for (let page = 1; ; page += 1) {
    const assets = await loadPage(page, perPage);
    out.push(...assets);
    if (assets.length < perPage) return out;
  }
};
