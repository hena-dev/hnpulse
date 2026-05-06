import type { BqRow } from "../schema/bq-row.ts";
import type { BqClient } from "./types.ts";

export const BOOTSTRAP_DAYS = 730;
export const OVERLAP_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export const buildExtractSql = (): string =>
  `SELECT *
FROM \`bigquery-public-data.hacker_news.full\`
WHERE timestamp >= TIMESTAMP_SECONDS(@since)`;

export type ExtractMode = "bootstrap" | "incremental";

export interface ComputeSinceArgs {
  mode: ExtractMode;
  now: Date;
  lastMaxTs?: Date;
}

export const computeSinceTimestamp = (args: ComputeSinceArgs): Date => {
  if (args.mode === "bootstrap") {
    return new Date(args.now.getTime() - BOOTSTRAP_DAYS * MS_PER_DAY);
  }
  if (args.lastMaxTs === undefined) {
    throw new Error("incremental mode requires lastMaxTs");
  }
  return new Date(args.lastMaxTs.getTime() - OVERLAP_DAYS * MS_PER_DAY);
};

export interface ExtractRowsArgs {
  since: Date;
  maxBytesBilled: number;
}

export const extractRows = async (
  client: BqClient,
  args: ExtractRowsArgs,
): Promise<readonly BqRow[]> => {
  const rows = await client.query<BqRow>(buildExtractSql(), {
    maxBytesBilled: args.maxBytesBilled,
    params: { since: Math.floor(args.since.getTime() / 1000) },
  });
  return rows;
};
