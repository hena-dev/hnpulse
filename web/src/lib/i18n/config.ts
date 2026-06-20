import { RANGE_IDS, type RangeId } from "../range/range.ts";
import rawLocaleConfigs from "./locale-configs.json";

export const SITE_URL = "https://hnpulse.hena.dev";
export const DEFAULT_LOCALE = "en";
export const DEFAULT_RANGE: RangeId = "1m";
export const LANGUAGE_STORAGE_KEY = "hnpulse.locale";

export const LOCALES = [
  "en",
  "zh",
  "es",
  "hi",
  "ar",
  "pt",
  "id",
  "ja",
  "ru",
  "fr",
  "de",
  "ko",
  "tr",
  "vi",
  "it",
  "pl",
  "nl",
  "th",
  "fa",
  "uk",
  "zh-tw",
] as const;

export type Locale = (typeof LOCALES)[number];

export interface LocaleConfig {
  name: string;
  nativeName: string;
  htmlLang: string;
  hrefLang: string;
  intlLocale: string;
  dir: "ltr" | "rtl";
  aliases: readonly string[];
}

export const LOCALE_CONFIGS = rawLocaleConfigs as Record<Locale, LocaleConfig>;

const localeSet = new Set<string>(LOCALES);
const rangeSet = new Set<string>(RANGE_IDS);

export const isLocale = (value: string): value is Locale => localeSet.has(value);

export const isRangeId = (value: string): value is RangeId => rangeSet.has(value);

export const normalizeLocaleCode = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-");

export const NON_DEFAULT_LOCALES = LOCALES.filter(
  (locale): locale is Exclude<Locale, typeof DEFAULT_LOCALE> => locale !== DEFAULT_LOCALE,
);

export const localizedRangePath = (locale: Locale, range: RangeId = DEFAULT_RANGE): string => {
  if (locale === DEFAULT_LOCALE) return `/${range}`;
  if (range === DEFAULT_RANGE) return `/${locale}`;
  return `/${locale}/${range}`;
};

export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).toString();

export const openGraphLocale = (locale: Locale): string =>
  LOCALE_CONFIGS[locale].intlLocale.replace("-", "_");

export const localeFromPathname = (pathname: string): Locale => {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment === undefined) return DEFAULT_LOCALE;
  const normalized = normalizeLocaleCode(segment);
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
};

export const rangeFromPathname = (pathname: string, fallbackRange: RangeId): RangeId => {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] === undefined ? "" : normalizeLocaleCode(segments[0]);
  const candidate = isLocale(first) ? (segments[1] ?? DEFAULT_RANGE) : (segments[0] ?? "");
  return isRangeId(candidate) ? candidate : fallbackRange;
};

export const matchBrowserLocale = (languages: readonly string[]): Locale => {
  for (const raw of languages) {
    const normalized = normalizeLocaleCode(raw);
    if (isLocale(normalized)) return normalized;
    if (
      normalized === "zh-hant" ||
      normalized.startsWith("zh-hant-") ||
      normalized.startsWith("zh-tw") ||
      normalized.startsWith("zh-hk") ||
      normalized.startsWith("zh-mo")
    ) {
      return "zh-tw";
    }
    const base = normalized.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
};

export interface AlternateLink {
  hrefLang: string;
  href: string;
}

export const alternateLinksForRange = (range: RangeId): AlternateLink[] => [
  ...LOCALES.map((locale) => ({
    hrefLang: LOCALE_CONFIGS[locale].hrefLang,
    href: absoluteUrl(localizedRangePath(locale, range)),
  })),
  {
    hrefLang: "x-default",
    href: absoluteUrl(localizedRangePath(DEFAULT_LOCALE, range)),
  },
];

export const localeRedirectTargets = (): { aliases: readonly string[]; target: string }[] =>
  LOCALES.map((locale) => ({
    aliases: LOCALE_CONFIGS[locale].aliases,
    target: localizedRangePath(locale, DEFAULT_RANGE),
  }));
