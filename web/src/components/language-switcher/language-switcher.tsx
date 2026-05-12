import type { ChangeEvent, JSX } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  LOCALE_CONFIGS,
  LOCALES,
  type Locale,
  localizedRangePath,
} from "../../lib/i18n/config.ts";
import type { RangeId } from "../../lib/range/range.ts";

export interface LanguageSwitcherProps {
  locale: Locale;
  range: RangeId;
  label?: string;
  navigate?: (href: string) => void;
}

/* v8 ignore next -- real browser navigation is not meaningful in jsdom. */
const defaultNavigate = (href: string): void => {
  window.location.assign(href);
};

const persistLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors; navigation should still work.
  }
};

export const LanguageSwitcher = ({
  locale,
  range,
  label = "Language",
  navigate = defaultNavigate,
}: LanguageSwitcherProps): JSX.Element => {
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextLocale = event.currentTarget.value as Locale;
    persistLocale(nextLocale);
    if (nextLocale !== locale) navigate(localizedRangePath(nextLocale, range));
  };

  return (
    <label className="inline-flex items-center gap-1">
      <span>{label}</span>
      <select
        value={locale}
        onChange={onChange}
        className="h-6 rounded-sm border bg-background px-1 text-[0.6875rem] text-foreground"
      >
        {LOCALES.map((id) => (
          <option key={id} value={id}>
            {LOCALE_CONFIGS[id].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
};
