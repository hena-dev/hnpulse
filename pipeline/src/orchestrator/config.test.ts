import { expect, it } from "vitest";
import { parseUploadCap } from "./config.ts";

it("defaults omitted or blank workflow upload caps, preserving an explicit zero", () => {
  for (const raw of [undefined, "", "  ", "\n"]) expect(parseUploadCap(raw)).toBe(400);
  expect(parseUploadCap("0")).toBe(0);
  expect(parseUploadCap(" 20 ")).toBe(20);
  for (const raw of ["-1", "1.5", "no", "Infinity"])
    expect(() => parseUploadCap(raw)).toThrow(/PIPELINE_UPLOAD_CAP/);
});
