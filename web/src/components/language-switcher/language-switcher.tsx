import type { ChangeEvent, JSX } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  LOCALE_CONFIGS,
  LOCALES,
  type Locale,
} from "../../lib/i18n/config.ts";

export interface LanguageSwitcherProps {
  locale: Locale;
  label?: string;
  onLocaleChange?: (locale: Locale) => void;
}

const persistLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors; navigation should still work.
  }
};

export const LanguageSwitcher = ({
  locale,
  label = "Language",
  onLocaleChange,
}: LanguageSwitcherProps): JSX.Element => {
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextLocale = event.currentTarget.value as Locale;
    persistLocale(nextLocale);
    if (nextLocale !== locale) onLocaleChange?.(nextLocale);
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
