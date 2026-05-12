import {
  absoluteUrl,
  alternateLinksForRange,
  DEFAULT_RANGE,
  LOCALES,
  type Locale,
  localizedRangePath,
} from "../lib/i18n/config.ts";
import { RANGE_IDS, type RangeId } from "../lib/range/range.ts";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const localizedPagePaths = (): { locale: Locale; range: RangeId; path: string }[] =>
  LOCALES.flatMap((locale) =>
    RANGE_IDS.map((range) => ({
      locale,
      range,
      path: localizedRangePath(locale, range),
    })),
  ).filter(
    (page, index, pages) => pages.findIndex((candidate) => candidate.path === page.path) === index,
  );

const urlEntry = ({ range, path }: { range: RangeId; path: string }): string => {
  const alternates = alternateLinksForRange(range)
    .map(
      (link) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(link.hrefLang)}" href="${escapeXml(
          link.href,
        )}" />`,
    )
    .join("\n");
  const priority = range === DEFAULT_RANGE ? "1.0" : "0.8";
  return `  <url>
    <loc>${escapeXml(absoluteUrl(path))}</loc>
${alternates}
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`;
};

export const GET = (): Response => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${localizedPagePaths().map(urlEntry).join("\n")}
</urlset>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
