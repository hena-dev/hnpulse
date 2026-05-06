import { describe, expect, it } from "vitest";
import { countLogicalLines } from "./check-file-size.ts";

describe("countLogicalLines", () => {
  it("returns 0 for empty content", () => {
    expect(countLogicalLines("")).toBe(0);
  });

  it("ignores blank lines", () => {
    expect(countLogicalLines("\n\n\n")).toBe(0);
  });

  it("ignores // single-line comments", () => {
    expect(countLogicalLines("// hi\n// there")).toBe(0);
  });

  it("ignores import lines", () => {
    expect(countLogicalLines('import x from "y";\nimport { z } from "w";')).toBe(0);
  });

  it("ignores /* ... */ block comments across multiple lines", () => {
    const src = "/*\n * doc\n * here\n */\nconst x = 1;";
    expect(countLogicalLines(src)).toBe(1);
  });

  it("counts a single-line block comment as 0", () => {
    expect(countLogicalLines("/* one liner */")).toBe(0);
  });

  it("counts logical statements", () => {
    const src = "const a = 1;\nconst b = 2;\nfunction f() { return a + b; }";
    expect(countLogicalLines(src)).toBe(3);
  });

  it("ignores export-only re-export lines", () => {
    expect(countLogicalLines('export { foo } from "./foo";')).toBe(0);
    expect(countLogicalLines('export type { Bar } from "./bar";')).toBe(0);
  });
});
