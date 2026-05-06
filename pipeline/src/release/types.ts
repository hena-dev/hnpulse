/**
 * Minimal interface around a single rolling GitHub Release (`data-snapshot`)
 * holding daily Parquet snapshot assets.  Real implementation in
 * `real-manager.ts` (excluded from coverage).
 */
export interface ReleaseAsset {
  name: string;
  size: number;
  url: string;
}

export interface ReleaseManager {
  listAssets(): Promise<readonly ReleaseAsset[]>;
  uploadAsset(name: string, localPath: string, contentType?: string): Promise<ReleaseAsset>;
  deleteAsset(name: string): Promise<void>;
  downloadAsset(name: string, destPath: string): Promise<void>;
}
