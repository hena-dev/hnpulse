import { describe, expect, it } from "vitest";
import {
  alternateLinksForRange,
  DEFAULT_RANGE,
  localeFromPathname,
  localeRedirectTargets,
  localizedRangePath,
  matchBrowserLocale,
  rangeFromPathname,
} from "./config.ts";

describe("localizedRangePath", () => {
  it("keeps English unprefixed", () => {
    expect(localizedRangePath("en", "1m")).toBe("/1m");
    expect(localizedRangePath("en", "1w")).toBe("/1w");
  });

  it("uses the locale root for localized default range pages", () => {
    expect(localizedRangePath("ko", DEFAULT_RANGE)).toBe("/ko");
    expect(localizedRangePath("ja", "1w")).toBe("/ja/1w");
  });
});

describe("path parsing", () => {
  it("finds locale and range from localized paths", () => {
    expect(localeFromPathname("/ko/1w")).toBe("ko");
    expect(rangeFromPathname("/ko", "2y")).toBe("1m");
    expect(rangeFromPathname("/ko/3m", "2y")).toBe("3m");
  });

  it("falls back for invalid paths", () => {
    expect(localeFromPathname("/")).toBe("en");
    expect(rangeFromPathname("/", "2y")).toBe("2y");
    expect(localeFromPathname("/not-a-locale")).toBe("en");
    expect(rangeFromPathname("/not-a-range", "2y")).toBe("2y");
  });
});

describe("matchBrowserLocale", () => {
  it("matches full and base language tags", () => {
    expect(matchBrowserLocale(["es-MX"])).toBe("es");
    expect(matchBrowserLocale(["ko-KR"])).toBe("ko");
  });

  it("routes traditional Chinese browser tags to zh-tw", () => {
    expect(matchBrowserLocale(["zh-Hant-HK"])).toBe("zh-tw");
    expect(matchBrowserLocale(["zh-TW"])).toBe("zh-tw");
  });

  it("falls back to English", () => {
    expect(matchBrowserLocale([])).toBe("en");
    expect(matchBrowserLocale(["xx-YY"])).toBe("en");
  });
});

describe("alternateLinksForRange", () => {
  it("includes localized alternates and x-default", () => {
    const links = alternateLinksForRange("1m");
    expect(links).toContainEqual({ hrefLang: "ko", href: "https://hnpulse.hena.dev/ko" });
    expect(links).toContainEqual({ hrefLang: "en", href: "https://hnpulse.hena.dev/1m" });
    expect(links).toContainEqual({ hrefLang: "x-default", href: "https://hnpulse.hena.dev/1m" });
  });
});

describe("localeRedirectTargets", () => {
  it("returns static redirect targets for browser-language routing", () => {
    const targets = localeRedirectTargets();
    expect(targets).toContainEqual(
      expect.objectContaining({ aliases: expect.arrayContaining(["ko-kr"]), target: "/ko" }),
    );
    expect(targets).toContainEqual(
      expect.objectContaining({ aliases: expect.arrayContaining(["en-us"]), target: "/1m" }),
    );
  });
});
