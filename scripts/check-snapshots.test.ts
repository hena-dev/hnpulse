import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { METRIC_KEYS } from "../pipeline/src/schema/metrics.ts";
import { RANGE_IDS } from "../pipeline/src/schema/range.ts";
import { assertFinalsUnchanged, checkSnapshotCoverage, checkSnapshots } from "./check-snapshots.ts";

let root: string;
let data: string;
const write = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
const meta = (last = "2025-01-08") => ({
  dataAsOf: last,
  snapshots: { first: "2025-01-01", finalThrough: "2025-01-01", last },
});
const snapshot = (day: string, status: string) => ({
  schemaVersion: 1,
  status,
  windowEnd: day,
  windowStart: new Date(Date.parse(day) - 729 * 86_400_000).toISOString().slice(0, 10),
  lastUpdated: "2025-01-09T14:00:00Z",
  metrics: Object.fromEntries(METRIC_KEYS.map((key) => [key, Array(730).fill(1)])),
  topDomainsByRange: Object.fromEntries(RANGE_IDS.map((range) => [range, []])),
});
const seed = () => {
  write(join(data, "meta.json"), meta());
  for (let i = 1; i <= 8; i++) {
    const day = `2025-01-0${i}`;
    write(
      join(data, i === 1 ? "snapshots" : "provisional", `${day}.json`),
      snapshot(day, i === 1 ? "final" : "provisional"),
    );
  }
};
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "hnpulse-snapshots-"));
  data = join(root, "web/public/data");
  for (const dir of ["snapshots", "provisional"]) mkdirSync(join(data, dir), { recursive: true });
  git("init");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  write(join(data, "meta.json"), {});
  git("add", ".");
  git("commit", "-m", "baseline");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("immutable snapshot guard", () => {
  it("allows only newly added final files", () => {
    assertFinalsUnchanged("");
    assertFinalsUnchanged("A\tweb/public/data/snapshots/2025-01-01.json\n");
    for (const kind of ["M", "D", "R100"]) {
      expect(() => assertFinalsUnchanged(`${kind}\told.json`)).toThrow("immutable");
    }
  });
  it("supports the pre-backfill deployment, then verifies complete final and provisional coverage", () => {
    expect(checkSnapshots(root)).toBe(0);
    seed();
    expect(checkSnapshots(root)).toBe(8);
    rmSync(join(data, "provisional/2025-01-07.json"));
    expect(() => checkSnapshotCoverage(data)).toThrow();
  });
  it("rejects mismatched dates, windows, states, metrics and bounds", () => {
    seed();
    const path = join(data, "snapshots/2025-01-01.json");
    const good = snapshot("2025-01-01", "final");
    for (const change of [
      { windowEnd: "2025-01-02" },
      { windowStart: "2024-01-01" },
      { status: "provisional" },
      { lastUpdated: "invalid" },
      { metrics: {} },
    ]) {
      write(path, { ...good, ...change });
      expect(() => checkSnapshotCoverage(data)).toThrow();
    }
    write(path, good);
    write(join(data, "meta.json"), { ...meta(), dataAsOf: "2025-01-09" });
    expect(() => checkSnapshotCoverage(data)).toThrow("bounds");
  });
  it("rejects modifications, deletions and assume-unchanged final files", () => {
    seed();
    git("add", ".");
    git("commit", "-m", "publish");
    const path = "web/public/data/snapshots/2025-01-01.json";
    const original = readFileSync(join(root, path));
    write(join(root, path), { changed: true });
    expect(() => checkSnapshots(root)).toThrow("immutable");
    git("update-index", "--assume-unchanged", path);
    expect(() => checkSnapshots(root)).toThrow("Final snapshot changed");
    rmSync(join(root, path));
    expect(() => checkSnapshots(root)).toThrow();
    writeFileSync(join(root, path), original);
    write(join(data, "meta.json"), {});
    expect(() => checkSnapshots(root)).toThrow("manifest cannot be removed");
  });
  it("does not allow a manifest to move backward", () => {
    seed();
    git("add", ".");
    git("commit", "-m", "publish");
    write(join(data, "meta.json"), {
      dataAsOf: "2025-01-01",
      snapshots: { first: "2025-01-01", finalThrough: "2024-12-25", last: "2025-01-01" },
    });
    write(join(data, "provisional/2025-01-01.json"), snapshot("2025-01-01", "provisional"));
    expect(() => checkSnapshots(root)).toThrow("backward");
  });
  it("validates mixed frozen v1 and extended v2 history and rejects truncated v2 windows", () => {
    seed();
    const path = join(data, "provisional/2025-01-08.json");
    const count = (Date.parse("2025-01-08") - Date.parse("2023-01-01")) / 86_400_000 + 1;
    write(path, {
      ...snapshot("2025-01-08", "provisional"),
      schemaVersion: 2,
      windowStart: "2023-01-01",
      metrics: Object.fromEntries(METRIC_KEYS.map((key) => [key, Array(count).fill(1)])),
    });
    expect(checkSnapshotCoverage(data)).toBe(8);
    write(path, { ...snapshot("2025-01-08", "provisional"), schemaVersion: 2 });
    expect(() => checkSnapshotCoverage(data)).toThrow("Invalid snapshot");
  });
});
