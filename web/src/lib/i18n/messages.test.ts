import { describe, expect, it } from "vitest";
import { formatMessage, getMessages } from "./messages.ts";

describe("getMessages", () => {
  it("returns locale-specific copy", () => {
    expect(getMessages("ko").range.ariaLabel).toBe("기간");
  });
});

describe("formatMessage", () => {
  it("replaces named placeholders", () => {
    expect(formatMessage("as of {date}", { date: "May 5" })).toBe("as of May 5");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(formatMessage("value {missing}", {})).toBe("value {missing}");
  });
});
