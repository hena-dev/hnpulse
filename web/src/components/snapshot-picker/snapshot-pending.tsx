import { LOCALE_CONFIGS, type Locale } from "../../lib/i18n/config.ts";
import { snapshotMessages } from "../../lib/snapshots/messages.ts";
import { Button } from "../ui/button.tsx";

export const SnapshotPending = ({ locale }: { locale: Locale }) => {
  const copy = snapshotMessages(locale);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2" dir={LOCALE_CONFIGS[locale].dir}>
      <Button
        variant="outline"
        className="h-8 px-2 text-xs"
        disabled
        aria-describedby="snapshot-preparing"
      >
        {copy.date}
      </Button>
      <p id="snapshot-preparing" role="status" className="max-w-sm text-xs text-muted-foreground">
        {copy.preparing}
      </p>
    </div>
  );
};
