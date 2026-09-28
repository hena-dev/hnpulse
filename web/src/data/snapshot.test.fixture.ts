import { RANGE_IDS } from "../lib/range/range.ts";
import { METRIC_KEYS, type MetaJson, type SnapshotJson } from "./types.ts";

export const bounds = { first: "2025-01-01", finalThrough: "2025-01-10", last: "2025-01-17" };
export const snapshotFixture = (
  date = "2025-01-10",
  status: SnapshotJson["status"] = "final",
  value = 42,
): SnapshotJson => ({
  schemaVersion: 1,
  windowStart: date,
  windowEnd: date,
  status,
  lastUpdated: "2025-01-18T12:00:00.000Z",
  metrics: Object.fromEntries(
    METRIC_KEYS.map((key) => [key, [value]]),
  ) as unknown as SnapshotJson["metrics"],
  topDomainsByRange: Object.fromEntries(
    RANGE_IDS.map((range) => [range, [{ name: "snapshot.example", stories: 1, share: 1 }]]),
  ) as unknown as SnapshotJson["topDomainsByRange"],
});
export const metaFixture: MetaJson = {
  schemaVersion: 1,
  lastUpdated: "2025-01-18T13:00:00Z",
  dataAsOf: "2025-01-17",
  windowStart: "2024-01-01",
  windowEnd: "2025-01-17",
  kpisFile: "/data/kpis.abcdef.json",
  buildSha: "test",
  pipelineVersion: "test",
  dataSources: ["bigquery"],
  stabilizationDays: 7,
  provisionalFrom: "2025-01-11",
  snapshots: bounds,
};
export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
