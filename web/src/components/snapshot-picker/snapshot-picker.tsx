import { CalendarDays } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { SnapshotBounds, SnapshotJson } from "../../data/types.ts";
import { formatDateOnly } from "../../lib/format/date.ts";
import { LOCALE_CONFIGS, type Locale } from "../../lib/i18n/config.ts";
import { addDays } from "../../lib/snapshots/date.ts";
import { snapshotIntlLocale, snapshotMessages } from "../../lib/snapshots/messages.ts";
import { Button } from "../ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.tsx";

const SnapshotCalendar = lazy(() =>
  import("./snapshot-calendar.tsx").then((module) => ({ default: module.SnapshotCalendar })),
);
export interface SnapshotPickerProps {
  date: string | null;
  bounds: SnapshotBounds;
  locale: Locale;
  stabilizationDays: number;
  status?: SnapshotJson["status"] | undefined;
  asOfLabel?: string;
  onChange: (date: string | null) => void;
}

export const SnapshotPicker = ({
  date,
  bounds,
  locale,
  stabilizationDays,
  status,
  asOfLabel = "as of {date}",
  onChange,
}: SnapshotPickerProps) => {
  const [open, setOpen] = useState(false);
  const copy = snapshotMessages(locale);
  const config = LOCALE_CONFIGS[locale];
  const format = (day: string) => formatDateOnly(day, snapshotIntlLocale(config.intlLocale));
  // Final publication is a contiguous prefix; a fetched final can advance stale picker metadata.
  const calendarBounds =
    status === "final" && date && date > bounds.finalThrough
      ? { ...bounds, finalThrough: date }
      : bounds;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2" dir={config.dir}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-1.5 px-2 text-xs font-normal text-muted-foreground"
            aria-label={`${copy.date}: ${date ? format(date) : copy.latest}`}
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <span suppressHydrationWarning>
              {asOfLabel.replace("{date}", format(date ?? bounds.last))}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" dir={config.dir} aria-label={copy.date}>
          {open && (
            <Suspense
              fallback={
                <p role="status" className="p-4">
                  {copy.loading}
                </p>
              }
            >
              <SnapshotCalendar
                date={date}
                bounds={calendarBounds}
                locale={locale}
                onSelect={(day) => {
                  onChange(day);
                  setOpen(false);
                }}
              />
            </Suspense>
          )}
          {date && date > calendarBounds.finalThrough && (
            <p className="max-w-72 px-3 pb-3 text-xs text-muted-foreground" role="status">
              {copy.provisional} ·{" "}
              {copy.estimate.replace("{date}", format(addDays(date, stabilizationDays + 1)))}
            </p>
          )}
        </PopoverContent>
      </Popover>
      {date && (
        <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => onChange(null)}>
          {copy.latest}
        </Button>
      )}
      {date && date > calendarBounds.finalThrough && (
        <span className="text-xs text-muted-foreground">{copy.provisional}</span>
      )}
    </div>
  );
};
