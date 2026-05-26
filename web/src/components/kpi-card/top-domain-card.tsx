import type { JSX } from "react";
import type { TopDomainEntry } from "../../data/types.ts";
import { formatInteger, formatPercent } from "../../lib/format/number.ts";
import { formatMessage } from "../../lib/i18n/format-message.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { TopDomainKpiEntry } from "../../lib/kpi/catalog.ts";

export interface TopDomainCardProps {
  entry: TopDomainKpiEntry;
  top: TopDomainEntry | null;
  intlLocale?: string;
  messages?: Messages["topDomain"];
}

const defaultMessages = {
  ofStories: "{share} of stories",
  submissions: "{count} submissions",
};

export const TopDomainCard = ({
  entry,
  top,
  intlLocale,
  messages = defaultMessages,
}: TopDomainCardProps): JSX.Element => (
  <article className="rounded-md border bg-card p-3 flex flex-col gap-1">
    <header className="text-xs uppercase tracking-wider text-muted-foreground">
      {entry.label}
    </header>
    {top === null ? (
      <div className="text-2xl font-semibold tabular-nums text-muted-foreground">—</div>
    ) : (
      <>
        <div className="text-xl font-semibold truncate" title={top.name}>
          {top.name}
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          {formatMessage(messages.ofStories, { share: formatPercent(top.share, intlLocale) })}
        </div>
        <div className="text-[0.625rem] text-muted-foreground tabular-nums">
          {formatMessage(messages.submissions, { count: formatInteger(top.stories, intlLocale) })}
        </div>
      </>
    )}
  </article>
);
