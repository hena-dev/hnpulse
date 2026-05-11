/**
 * Minimal interface around BigQuery so the orchestrator can be tested without
 * any network access.  The real implementation lives in `real-client.ts` and
 * is excluded from coverage.
 */
export interface BqQueryOptions {
  /** Hard cap on bytes scanned; the BQ job aborts (uncharged) if exceeded. */
  maxBytesBilled: number;
  /** Named query parameters. */
  params?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface BqClient {
  query<T = Record<string, unknown>>(sql: string, options: BqQueryOptions): Promise<readonly T[]>;
  queryStream?<T = Record<string, unknown>>(sql: string, options: BqQueryOptions): AsyncIterable<T>;
}
