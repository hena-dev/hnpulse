import type { JSX } from "react";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { TimeSeriesChart } from "./time-series-chart.tsx";

export interface ActiveUsersProps {
  commenters: readonly BucketPoint[];
  submitters: readonly BucketPoint[];
  messages: Messages["charts"];
  intlLocale: string;
}

export const ActiveUsers = ({
  commenters,
  submitters,
  messages,
  intlLocale,
}: ActiveUsersProps): JSX.Element => (
  <TimeSeriesChart
    first={commenters}
    second={submitters}
    names={[messages.seriesCommenters, messages.seriesSubmitters]}
    title={messages.activeUsersTitle}
    description={messages.activeUsersDescription}
    messages={messages}
    intlLocale={intlLocale}
  />
);
