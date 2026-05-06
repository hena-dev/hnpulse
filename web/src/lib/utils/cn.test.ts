import { describe, expect, it } from "vitest";
import { cn } from "./cn.ts";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
  it("dedupes conflicting tailwind classes (keep last)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
