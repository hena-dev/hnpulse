import { describe, expect, it, vi } from "vitest";
import { listReleaseAssetsAllPages } from "./paginate.ts";

describe("listReleaseAssetsAllPages", () => {
  it("loads all release asset pages instead of stopping at the first 100 assets", async () => {
    const page = vi.fn(async (pageNumber: number, perPage: number) =>
      Array.from({ length: pageNumber === 1 ? perPage : 3 }, (_, i) => ({
        id: pageNumber * 1000 + i,
        name: `items-${pageNumber}-${i}.parquet`,
        size: 1,
        browser_download_url: "https://example.com/a",
      })),
    );

    const assets = await listReleaseAssetsAllPages(page);

    expect(assets).toHaveLength(103);
    expect(page).toHaveBeenCalledTimes(2);
    expect(page).toHaveBeenLastCalledWith(2, 100);
  });
});
