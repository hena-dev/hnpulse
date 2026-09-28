import { z } from "zod";
import { buildDashboardDataByRange } from "../lib/dashboard-data.ts";
import { addDays, DAY_MS, isSnapshotDay, utcDay } from "../lib/snapshots/date.ts";
import { TopDomainsByRange } from "./schema.ts";
import { METRIC_KEYS, type SnapshotBounds, type SnapshotJson } from "./types.ts";

const day = z.string().refine(isSnapshotDay);
export const SnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    windowStart: day,
    windowEnd: day,
    metrics: z.object(Object.fromEntries(METRIC_KEYS.map((key) => [key, z.array(z.number())]))),
    topDomainsByRange: TopDomainsByRange,
    lastUpdated: z.iso.datetime(),
    status: z.enum(["final", "provisional"]),
  })
  .strict()
  .superRefine((v, ctx) => {
    const count = (utcDay(v.windowEnd).getTime() - utcDay(v.windowStart).getTime()) / DAY_MS + 1;
    if (
      count < 1 ||
      !Number.isFinite(count) ||
      METRIC_KEYS.some((key) => v.metrics[key]?.length !== count)
    ) {
      ctx.addIssue({ code: "custom", message: "Invalid snapshot window/metric lengths" });
    }
  });

export const prepareSnapshot = (snapshot: SnapshotJson) => ({
  snapshot,
  ranges: buildDashboardDataByRange({
    ...snapshot,
    days: Array.from({ length: snapshot.metrics.stories.length }, (_, i) =>
      addDays(snapshot.windowStart, i),
    ),
  }),
});
export type LoadedSnapshot = ReturnType<typeof prepareSnapshot>;
const finals = new Map<string, LoadedSnapshot>();
const pending = new Map<string, Promise<LoadedSnapshot>>();

const requestSnapshot = (date: string, final: boolean): Promise<LoadedSnapshot> => {
  const path = `/data/${final ? "snapshots" : "provisional"}/${date}.json`;
  // A final response remains authoritative even when the page's embedded metadata is stale.
  const cached = finals.get(`/data/snapshots/${date}.json`);
  if (cached) return Promise.resolve(cached);
  const inflight = pending.get(path);
  if (inflight) return inflight;
  const request = (async () => {
    const response = await fetch(path, { cache: final ? "default" : "no-store" });
    if (!final && response.status === 404) return requestSnapshot(date, true);
    if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
    const snapshot = SnapshotSchema.parse(await response.json()) as unknown as SnapshotJson;
    if (snapshot.windowEnd !== date || snapshot.status !== (final ? "final" : "provisional")) {
      throw new Error("Snapshot date/status mismatch");
    }
    const result = prepareSnapshot(snapshot);
    if (final) finals.set(path, result);
    return result;
  })().finally(() => pending.delete(path));
  pending.set(path, request);
  return request;
};

export const loadSnapshot = (date: string, bounds: SnapshotBounds): Promise<LoadedSnapshot> =>
  requestSnapshot(date, date <= bounds.finalThrough);
