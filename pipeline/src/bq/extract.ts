import { startOfUtcDay } from "../dates/utc-day.ts";
import type { BqRow } from "../schema/bq-row.ts";
import type { BqClient } from "./types.ts";

export const BOOTSTRAP_DAYS = 730;
const MS_PER_DAY = 86_400_000;

export const buildExtractSql = (): string =>
  `SELECT * REPLACE(CONCAT(FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', timestamp, 'UTC'), 'Z') AS timestamp)
FROM \`bigquery-public-data.hacker_news.full\`
WHERE timestamp >= TIMESTAMP_SECONDS(@since)
  AND timestamp < TIMESTAMP_SECONDS(@until)`;

export type ExtractMode = "bootstrap" | "incremental";

export interface ComputeSinceArgs {
  mode: ExtractMode;
  now: Date;
  lastMaxTs?: Date;
}

export const computeSinceTimestamp = (args: ComputeSinceArgs): Date => {
  if (args.mode === "bootstrap") {
    return startOfUtcDay(new Date(args.now.getTime() - BOOTSTRAP_DAYS * MS_PER_DAY));
  }
  if (args.lastMaxTs === undefined) {
    throw new Error("incremental mode requires lastMaxTs");
  }
  return new Date(args.lastMaxTs.getTime() + 1);
};

export interface ExtractRowsArgs {
  since: Date;
  until: Date;
  maxBytesBilled: number;
}

const extractQueryOptions = (args: ExtractRowsArgs) => ({
  maxBytesBilled: args.maxBytesBilled,
  params: {
    since: Math.floor(args.since.getTime() / 1000),
    until: Math.floor(args.until.getTime() / 1000),
  },
});

export const extractRows = async (
  client: BqClient,
  args: ExtractRowsArgs,
): Promise<readonly BqRow[]> => {
  const rows = await client.query<BqRow>(buildExtractSql(), extractQueryOptions(args));
  return rows;
};

export async function* extractRowsStream(
  client: BqClient,
  args: ExtractRowsArgs,
): AsyncIterable<BqRow> {
  if (client.queryStream !== undefined) {
    yield* client.queryStream<BqRow>(buildExtractSql(), extractQueryOptions(args));
    return;
  }
  yield* await extractRows(client, args);
}
