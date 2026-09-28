import { arSA } from "date-fns/locale/ar-SA";
import { de } from "date-fns/locale/de";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { faIR } from "date-fns/locale/fa-IR";
import { fr } from "date-fns/locale/fr";
import { hi } from "date-fns/locale/hi";
import { id } from "date-fns/locale/id";
import { it } from "date-fns/locale/it";
import { ja } from "date-fns/locale/ja";
import { ko } from "date-fns/locale/ko";
import { nl } from "date-fns/locale/nl";
import { pl } from "date-fns/locale/pl";
import { ptBR } from "date-fns/locale/pt-BR";
import { ru } from "date-fns/locale/ru";
import { th } from "date-fns/locale/th";
import { tr } from "date-fns/locale/tr";
import { uk } from "date-fns/locale/uk";
import { vi } from "date-fns/locale/vi";
import { zhCN } from "date-fns/locale/zh-CN";
import { zhTW } from "date-fns/locale/zh-TW";
import type { SnapshotBounds } from "../../data/types.ts";
import { LOCALE_CONFIGS, type Locale } from "../../lib/i18n/config.ts";
import { dayString, firstSnapshotDay, utcDay } from "../../lib/snapshots/date.ts";
import { snapshotIntlLocale, snapshotMessages } from "../../lib/snapshots/messages.ts";
import { Calendar } from "../ui/calendar.tsx";

const locales = {
  en: enUS,
  zh: zhCN,
  "zh-tw": zhTW,
  es,
  hi,
  ar: arSA,
  pt: ptBR,
  id,
  ja,
  ru,
  fr,
  de,
  ko,
  tr,
  vi,
  it,
  pl,
  nl,
  th,
  fa: faIR,
  uk,
};
export interface SnapshotCalendarProps {
  date: string | null;
  bounds: SnapshotBounds;
  locale: Locale;
  onSelect: (date: string) => void;
}

export function SnapshotCalendar({ date, bounds, locale, onSelect }: SnapshotCalendarProps) {
  const config = LOCALE_CONFIGS[locale];
  const copy = snapshotMessages(locale);
  const format = (value: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(snapshotIntlLocale(config.intlLocale), {
      ...options,
      timeZone: "UTC",
    }).format(value);
  const provisional = (value: Date) =>
    dayString(value) > bounds.finalThrough && dayString(value) <= bounds.last;
  return (
    <>
      <Calendar
        mode="single"
        required
        timeZone="UTC"
        locale={locales[locale]}
        dir={config.dir}
        captionLayout="dropdown"
        startMonth={utcDay(firstSnapshotDay(bounds))}
        endMonth={utcDay(bounds.last)}
        defaultMonth={utcDay(date ?? bounds.last)}
        selected={utcDay(date ?? bounds.last)}
        disabled={[{ before: utcDay(firstSnapshotDay(bounds)) }, { after: utcDay(bounds.last) }]}
        onSelect={(value) => onSelect(dayString(value))}
        modifiers={{ provisional }}
        modifiersClassNames={{ provisional: "snapshot-provisional" }}
        formatters={{
          formatMonthDropdown: (value) => format(value, { month: "long" }),
          formatYearDropdown: (value) => format(value, { year: "numeric" }),
          formatCaption: (value) => format(value, { month: "long", year: "numeric" }),
        }}
        labels={{
          labelMonthDropdown: () => copy.month,
          labelYearDropdown: () => copy.year,
          labelPrevious: () => copy.previous,
          labelNext: () => copy.next,
          labelDayButton: (value) =>
            `${format(value, { dateStyle: "full" })}${provisional(value) ? ` · ${copy.provisional}` : ""}`,
        }}
      />
      {bounds.finalThrough < bounds.last && (
        <p className="px-3 pb-3 text-xs text-muted-foreground">• {copy.provisional}</p>
      )}
    </>
  );
}
