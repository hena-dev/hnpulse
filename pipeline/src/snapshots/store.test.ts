import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { plan, snapshot } from "./_test-fixtures.ts";
import { publishSnapshots } from "./publish.ts";
import { planSnapshots, readOptional, verifyFinal } from "./store.ts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "snapshot-store-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
const args = () => ({
  dataDir: dir,
  first: "2026-04-27",
  last: "2026-05-03",
  windowDays: 3,
  stabilizationDays: 2,
});
const put = async (folder: string, name: string, value: unknown) => {
  await mkdir(join(dir, folder), { recursive: true });
  await writeFile(join(dir, folder, name), JSON.stringify(value));
};

describe("snapshot storage", () => {
  it("plans bootstrap coverage and refreshes the finalization boundary", async () => {
    expect(await planSnapshots(args())).toEqual(plan());
    expect(await readOptional(join(dir, "missing"))).toBeUndefined();
    await expect(readOptional(dir)).rejects.toThrow();
  });
  it("verifies and reuses existing finals and catches up an old provisional frontier", async () => {
    await put("snapshots", "2026-04-27.json", snapshot("2026-04-27"));
    await put(".", "meta.json", { provisionalFrom: "2026-04-28" });
    const p = await planSnapshots(args());
    expect(p.pending[0]).toBe("2026-04-28");
    expect(p.aggregateStart).toBe("2026-04-26");
    expect(p.refreshFrom).toBe("2026-04-28");
    expect(p.existing.size).toBe(1);
    await put(".", "meta.json", {});
    expect((await planSnapshots(args())).refreshFrom).toBe("2026-04-28");
    await put("provisional", "2026-04-26.json", {});
    await put("provisional", "readme.txt", {});
    expect((await planSnapshots(args())).refreshFrom).toBe("2026-04-26");
  });
  it("rejects corrupt finals and invalid configuration instead of overwriting them", async () => {
    for (const value of [
      snapshot("2026-04-28"),
      snapshot("2026-04-27", 2),
      { ...snapshot("2026-04-27"), status: "provisional" },
    ]) {
      expect(() => verifyFinal(JSON.stringify(value), "2026-04-27", 3)).toThrow(/Invalid existing/);
    }
    await put("snapshots", "2026-05-03.json", snapshot("2026-05-03"));
    await expect(planSnapshots(args())).rejects.toThrow(/inside provisional/);
    for (const overrides of [
      { first: "2027-01-01" },
      { windowDays: 0 },
      { windowDays: 1.5 },
      { stabilizationDays: 0 },
      { stabilizationDays: 1.5 },
    ]) {
      await expect(planSnapshots({ ...args(), ...overrides })).rejects.toThrow(/configuration/);
    }
  });
  it("writes finals once, replaces provisionals, prunes promoted files, and copies reused finals", async () => {
    const p = plan("2026-05-01", "2026-05-03");
    const original = snapshot();
    await put("snapshots", "2026-05-01.json", original);
    await put("provisional", "2026-05-01.json", {});
    await put("provisional", "notes.txt", {});
    const before = await readFile(join(dir, "snapshots/2026-05-01.json"), "utf8");
    const values = [
      { ...original, lastUpdated: "2026-05-05T00:00:00Z" },
      { ...snapshot("2026-05-03"), status: "provisional" as const },
    ];
    await publishSnapshots({ outDir: dir, plan: p, snapshots: values, windowDays: 3 });
    expect(await readFile(join(dir, "snapshots/2026-05-01.json"), "utf8")).toBe(before);
    expect(await readdir(join(dir, "provisional"))).toEqual(["2026-05-03.json", "notes.txt"]);
    p.existing.set("2026-05-01", join(dir, "snapshots/2026-05-01.json"));
    const dest = join(dir, "dry-run");
    for (let i = 0; i < 2; i += 1) {
      await publishSnapshots({ outDir: dest, plan: p, snapshots: [], windowDays: 3 });
    }
    expect(await readFile(join(dest, "snapshots/2026-05-01.json"), "utf8")).toBe(before);
    await publishSnapshots({ outDir: dir, plan: p, snapshots: [], windowDays: 3 });
  });
  it("validates all destination finals before any final writes", async () => {
    await put("snapshots", "2026-05-01.json", { broken: true });
    await expect(
      publishSnapshots({
        outDir: dir,
        plan: plan(),
        snapshots: [snapshot("2026-04-27")],
        windowDays: 3,
      }),
    ).rejects.toThrow();
    expect(await readOptional(join(dir, "snapshots/2026-04-27.json"))).toBeUndefined();
  });
  it("surfaces filesystem failures rather than treating unreadable inputs as missing", async () => {
    await writeFile(join(dir, "provisional"), "not a directory");
    await expect(planSnapshots(args())).rejects.toThrow();
    await rm(join(dir, "provisional"));
    const p = plan();
    p.existing.set("2026-04-27", join(dir, "absent.json"));
    await expect(
      publishSnapshots({ outDir: dir, plan: p, snapshots: [], windowDays: 3 }),
    ).rejects.toThrow();
    await mkdir(join(dir, "provisional/2026-05-03.json"), { recursive: true });
    await expect(
      publishSnapshots({
        outDir: dir,
        plan: plan(),
        snapshots: [{ ...snapshot("2026-05-03"), status: "provisional" }],
        windowDays: 3,
      }),
    ).rejects.toThrow();
  });
});
