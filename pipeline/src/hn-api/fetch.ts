import type { BqRow } from "../schema/bq-row.ts";
import { hnItemToBqRow } from "./map.ts";
import type { HnApiClient } from "./types.ts";

const DEFAULT_BATCH_SIZE = 256;

export interface FetchHnApiRowsArgs {
  client: HnApiClient;
  since: Date;
  until: Date;
  batchSize?: number;
}

const idBatch = (high: number, size: number): number[] => {
  const low = Math.max(1, high - size + 1);
  const ids: number[] = [];
  for (let id = high; id >= low; id -= 1) ids.push(id);
  return ids;
};

interface FilteredRows {
  rows: readonly BqRow[];
  stop: boolean;
}

const filterRows = (
  rows: readonly (BqRow | null)[],
  since: number,
  until: number,
): FilteredRows => {
  const out: BqRow[] = [];
  let stop = false;
  for (const row of rows) {
    if (row === null) continue;
    if (row.time < since) {
      stop = true;
      continue;
    }
    if (row.time < until) out.push(row);
  }
  return { rows: out, stop };
};

const fetchRowsForIds = async (
  client: HnApiClient,
  ids: readonly number[],
): Promise<readonly (BqRow | null)[]> => {
  return (await Promise.all(ids.map((id) => client.item(id)))).map(hnItemToBqRow);
};

export async function* fetchHnApiRows(args: FetchHnApiRowsArgs): AsyncIterable<BqRow> {
  const since = Math.floor(args.since.getTime() / 1000);
  const until = Math.floor(args.until.getTime() / 1000);
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("batchSize must be positive");

  let high = await args.client.maxItem();
  while (high >= 1) {
    const ids = idBatch(high, batchSize);
    const filtered = filterRows(await fetchRowsForIds(args.client, ids), since, until);
    for (const row of filtered.rows) yield row;
    if (filtered.stop) return;
    high = (ids[ids.length - 1] as number) - 1;
  }
}
