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
  onChange: (date: string | null) => void;
}

export const SnapshotPicker = ({
  date,
  bounds,
  locale,
  stabilizationDays,
  status,
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
    <div className="mx-auto max-w-6xl px-4 pt-6 flex flex-wrap items-center gap-3" dir={config.dir}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-label={`${copy.date}: ${date ? format(date) : copy.latest}`}
          >
            {copy.date}: {date ? format(date) : copy.latest}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          dir={config.dir}
          aria-label={copy.date}
        >
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
        </PopoverContent>
      </Popover>
      {date && (
        <Button variant="ghost" onClick={() => onChange(null)}>
          {copy.latest}
        </Button>
      )}
      {date && date > calendarBounds.finalThrough && (
        <p className="text-xs text-muted-foreground" role="status">
          {copy.provisional} ·{" "}
          {copy.estimate.replace("{date}", format(addDays(date, stabilizationDays + 1)))}
        </p>
      )}
    </div>
  );
};
