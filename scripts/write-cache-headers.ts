import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const immutable = "Cache-Control: public, max-age=31536000, immutable";
const hashedAsset = /\.[A-Za-z0-9_-]{8,}\.(?:js|css)$/;

export const renderCacheHeaders = (template: string, assets: readonly string[]): string => {
  const rules = assets
    .filter((name) => hashedAsset.test(name))
    .toSorted()
    .map((name) => `/_astro/${name}\n  ${immutable}`);
  const templateRules = template.split("\n").filter((line) => line.startsWith("/")).length;
  if (templateRules + rules.length > 100) throw new Error("Cloudflare _headers exceeds 100 rules");
  return `${template.trimEnd()}\n\n# Only files present in this build may be cached immutably.\n${rules.join("\n")}\n`;
};

if (import.meta.main) {
  const publicHeaders = new URL("../web/public/_headers", import.meta.url);
  const distHeaders = new URL("../web/dist/_headers", import.meta.url);
  const assetsDir = new URL("../web/dist/_astro/", import.meta.url);
  const assets = readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  writeFileSync(distHeaders, renderCacheHeaders(readFileSync(publicHeaders, "utf8"), assets));
}
