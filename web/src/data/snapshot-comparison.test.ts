import { describe, expect, it } from "vitest";
import { buildSnapshots } from "../../../pipeline/src/snapshots/build.ts";
import { daysBetween, offsetDay } from "../../../pipeline/src/snapshots/dates.ts";
import { comparisonHistoryStart } from "../../../pipeline/src/snapshots/history.ts";
import { snapshotFixture } from "./snapshot.test.fixture.ts";
import { prepareSnapshot, SnapshotSchema } from "./snapshot.ts";
import type { SnapshotJson } from "./types.ts";

describe("pipeline to dashboard two-year comparison", () => {
  it.each([
    ["2026-12-29", 1459, null],
    ["2026-12-30", 1460, 0.5],
    ["2027-01-01", 1460, 0.5],
    ["2027-06-01", 1460, 0.5],
  ])("shows a change at %s only with two complete 730-day periods", (last, count, expectedDelta) => {
    const aggregateStart = comparisonHistoryStart(last, 730);
    const days = daysBetween(aggregateStart, last);
    const built = buildSnapshots({
      plan: {
        archiveFirst: "2023-01-01",
        first: last,
        last,
        finalThrough: offsetDay(last, -7),
        aggregateStart,
        refreshFrom: last,
        existing: new Map(),
        pending: [last],
      },
      windowDays: 730,
      now: new Date(`${offsetDay(last, 1)}T14:00:00Z`),
      dailyRows: days.map((day, i) => ({
        day,
        stories: i < days.length - 730 ? 10 : 15,
        comments: i < days.length - 730 ? 50 : 150,
        active_commenters: 5,
        active_submitters: 5,
        median_score: 5,
        p90_score: 10,
        comments_per_story: i < days.length - 730 ? 5 : 10,
        success_rate_gte100: 0.1,
        show_hn: 1,
        ask_hn: 1,
        jobs: 1,
        dead_flagged_ratio: 0.1,
        dead_flagged_total: 100,
      })),
      domainRows: [],
    });
    const raw = JSON.parse(JSON.stringify([...built.snapshots()][0]));
    const parsed = SnapshotSchema.parse(raw) as unknown as SnapshotJson;
    const { ranges } = prepareSnapshot(parsed);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.metrics.stories).toHaveLength(count);
    expect(ranges["2y"].summaries.stories.value).toBe(15);
    expect(ranges["2y"].summaries.stories.delta).toBe(expectedDelta);
    expect(ranges["2y"].summaries.commentsPerStory.delta).toBe(expectedDelta === null ? null : 1);
    expect(ranges["1y"].summaries.stories.delta).toBe(0);
    expect(ranges["2y"].detailSeries.stories.reduce((sum, point) => sum + point.value, 0)).toBe(
      730 * 15,
    );
  });
  it("continues to read frozen version-1 snapshots without inventing comparison data", () => {
    const old = snapshotFixture("2026-09-01", "final");
    const parsed = SnapshotSchema.parse(old) as unknown as SnapshotJson;
    expect(prepareSnapshot(parsed).ranges["2y"].summaries.stories.delta).toBeNull();
    expect(parsed).toEqual(old);
  });
});
