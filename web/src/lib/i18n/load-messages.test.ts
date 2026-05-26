import { describe, expect, it } from "vitest";
import { LOCALES } from "./config.ts";
import { loadMessages } from "./load-messages.ts";

describe("loadMessages", () => {
  it("loads every locale from its dynamic chunk", async () => {
    const loaded = await Promise.all(LOCALES.map((locale) => loadMessages(locale)));

    expect(loaded).toHaveLength(LOCALES.length);
    for (const messages of loaded) {
      expect(messages.metadata.title).toContain("HN Pulse");
      expect(messages.range.labels["1m"]).toBeTruthy();
    }
  });
});
