import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES } from "../web/src/lib/i18n/config.ts";
import { RANGE_IDS } from "../web/src/lib/range/range.ts";
import { renderCacheHeaders } from "./write-cache-headers.ts";

const template = readFileSync(new URL("../web/public/_headers", import.meta.url), "utf8");
const headers = renderCacheHeaders(template, [
  "app.ABCdef12.js",
  "styles.12345678.css",
  "font.12345678.woff2",
  "image.12345678.avif",
  "missing.js",
  "nested/file.12345678.js",
]);
const rules = new Map<string, string>();
let route = "";
for (const line of headers.split("\n")) {
  if (!line || line.startsWith("#")) continue;
  if (line.startsWith("/")) route = line;
  else rules.set(route, line.trim());
}

const immutable = "Cache-Control: public, max-age=31536000, immutable";
const mutable = "Cache-Control: public, max-age=300, stale-while-revalidate=3600";
const policyFor = (path: string): string[] =>
  [...rules]
    .filter(([route]) =>
      route.endsWith("*") ? path.startsWith(route.slice(0, -1)) : path === route,
    )
    .map(([, policy]) => policy);

describe("Cloudflare static asset caching", () => {
  it("keeps the immutable and mutable policies disjoint", () => {
    for (const path of [
      "/_astro/app.ABCdef12.js",
      "/_astro/styles.12345678.css",
      "/_astro/font.12345678.woff2",
      "/_astro/image.12345678.avif",
    ]) {
      expect(policyFor(path)).toEqual([immutable]);
    }
    expect(policyFor("/_astro/missing.js")).toEqual([]);
    expect(policyFor("/_astro/other.ABCdef12.js")).toEqual([]);
    for (const path of ["/data/meta.json", "/data/kpis-current.json", "/data/kpis.123.json"]) {
      expect(policyFor(path)).toEqual([mutable]);
    }
  });

  it("rejects header rules over Cloudflare's 100-rule limit", () => {
    const assets = Array.from(
      { length: 101 },
      (_, index) => `app.${String(index).padStart(8, "0")}.js`,
    );
    expect(() => renderCacheHeaders(template, assets)).toThrow("exceeds 100 rules");
  });

  it("covers all dashboard routes, including trailing slashes, without duplicate headers", () => {
    expect(policyFor("/")).toEqual([mutable]);
    for (const range of RANGE_IDS) {
      expect(policyFor(`/${range}`)).toEqual([mutable]);
      expect(policyFor(`/${range}/`)).toEqual([mutable]);
    }
    for (const locale of LOCALES.filter((item) => item !== "en")) {
      expect(policyFor(`/${locale}`)).toEqual([mutable]);
      expect(policyFor(`/${locale}/`)).toEqual([mutable]);
      for (const range of RANGE_IDS) expect(policyFor(`/${locale}/${range}`)).toEqual([mutable]);
    }
  });
});
