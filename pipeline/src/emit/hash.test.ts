import { describe, expect, it } from "vitest";
import { contentHash, kpisFilenameFor } from "./hash.ts";

describe("contentHash", () => {
  it("returns a deterministic 7-char hex digest", () => {
    expect(contentHash("hello")).toBe(contentHash("hello"));
    expect(contentHash("hello")).toMatch(/^[a-f0-9]{7}$/);
  });

  it("produces different digests for different inputs", () => {
    expect(contentHash("a")).not.toBe(contentHash("b"));
  });
});

describe("kpisFilenameFor", () => {
  it("renders /data/kpis.<sha>.json", () => {
    const name = kpisFilenameFor("payload");
    expect(name).toMatch(/^\/data\/kpis\.[a-f0-9]{7}\.json$/);
  });
});
