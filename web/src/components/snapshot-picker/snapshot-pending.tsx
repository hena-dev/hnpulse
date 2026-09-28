import { LOCALE_CONFIGS, type Locale } from "../../lib/i18n/config.ts";
import { snapshotMessages } from "../../lib/snapshots/messages.ts";
import { Button } from "../ui/button.tsx";

export const SnapshotPending = ({ locale }: { locale: Locale }) => {
  const copy = snapshotMessages(locale);
  return (
    <div
      className="mx-auto max-w-6xl px-4 pt-6 flex flex-wrap items-center gap-3"
      dir={LOCALE_CONFIGS[locale].dir}
    >
      <Button variant="outline" disabled aria-describedby="snapshot-preparing">
        {copy.date}
      </Button>
      <p id="snapshot-preparing" role="status" className="text-xs text-muted-foreground">
        {copy.preparing}
      </p>
    </div>
  );
};
