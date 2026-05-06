import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BqRow } from "../schema/bq-row.ts";
import { groupRowsByUtcDay, writeNdjsonByDay } from "./write-by-day.ts";

const row = (id: number, ts: string, type: BqRow["type"] = "story"): BqRow => ({
  id,
  type,
  by: "alice",
  title: null,
  url: null,
  text: null,
  score: 1,
  time: Math.floor(new Date(ts).getTime() / 1000),
  timestamp: ts,
  parent: null,
  descendants: null,
  ranking: null,
  dead: false,
  deleted: false,
});

describe("groupRowsByUtcDay", () => {
  it("groups rows by UTC day derived from .timestamp", () => {
    const rows = [
      row(1, "2024-05-04T00:00:00Z"),
      row(2, "2024-05-04T23:59:59Z"),
      row(3, "2024-05-05T00:00:01Z"),
    ];
    const grouped = groupRowsByUtcDay(rows);
    expect(grouped.get("2024-05-04")?.length).toBe(2);
    expect(grouped.get("2024-05-05")?.length).toBe(1);
  });

  it("yields an empty map for empty input", () => {
    expect(groupRowsByUtcDay([]).size).toBe(0);
  });
});

describe("writeNdjsonByDay", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hnpulse-ndjson-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes one items-YYYY-MM-DD.ndjson per day with one JSON line per row", async () => {
    const rows = [
      row(1, "2024-05-04T00:00:00Z"),
      row(2, "2024-05-04T12:00:00Z"),
      row(3, "2024-05-05T00:00:01Z"),
    ];
    const files = await writeNdjsonByDay(rows, dir);
    const names = (await readdir(dir)).sort();
    expect(names).toEqual(["items-2024-05-04.ndjson", "items-2024-05-05.ndjson"]);
    expect(files.map((f) => f.day).sort()).toEqual(["2024-05-04", "2024-05-05"]);
    const day1 = (await readFile(join(dir, "items-2024-05-04.ndjson"), "utf8")).trim();
    expect(day1.split("\n")).toHaveLength(2);
    expect(JSON.parse(day1.split("\n")[0] ?? "")).toMatchObject({ id: 1 });
  });

  it("returns an empty array when there are no rows", async () => {
    const files = await writeNdjsonByDay([], dir);
    expect(files).toEqual([]);
  });
});
