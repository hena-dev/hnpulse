import { BigQuery } from "@google-cloud/bigquery";
import type { BqClient, BqQueryOptions } from "./types.ts";

const PROJECT_ID = "molu-486406";

const loadCredentials = (): Record<string, unknown> | undefined => {
  const raw = process.env.GCP_SA_KEY;
  if (raw === undefined || raw.length === 0) return undefined;
  return JSON.parse(raw) as Record<string, unknown>;
};

/**
 * Real BigQuery client for the daily pipeline.
 *
 * NOTE on scaling: this implementation uses `bq.query()` which loads the full
 * result set into memory.  For the §8.3 bootstrap (~17.75 GB scan returning
 * tens of millions of rows) GitHub Actions runners will OOM.  Two production
 * options:
 *   1. Switch to the BigQuery Storage Read API (`@google-cloud/bigquery-storage`),
 *      which streams Arrow batches and works for tens-of-millions-of-row results.
 *   2. Run a BigQuery extract job to GCS as Parquet, then download.  Adds a
 *      paid GCS bucket so prefer (1) for the $0 budget.
 *
 * Until then, the daily run *after* the first successful bootstrap stays
 * comfortably in-memory because each incremental day returns ~50–100k rows.
 */
export const createRealBqClient = (): BqClient => {
  const credentials = loadCredentials();
  const bq = new BigQuery({
    projectId: PROJECT_ID,
    ...(credentials !== undefined ? { credentials } : {}),
  });
  const queryOptions = (sql: string, options: BqQueryOptions) => ({
    query: sql,
    params: (options.params ?? {}) as Record<string, unknown>,
    maximumBytesBilled: String(options.maxBytesBilled),
  });
  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      options: BqQueryOptions,
    ): Promise<readonly T[]> {
      const [rows] = await bq.query(queryOptions(sql, options));
      return rows as readonly T[];
    },
    async *queryStream<T = Record<string, unknown>>(
      sql: string,
      options: BqQueryOptions,
    ): AsyncIterable<T> {
      const [job] = await bq.createQueryJob(queryOptions(sql, options));
      for await (const row of job.getQueryResultsStream() as AsyncIterable<T>) {
        yield row;
      }
    },
  };
};
