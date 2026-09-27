import type { JSX } from "react";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { TimeSeriesChart } from "./time-series-chart.tsx";

export interface ScoreTrendProps {
  median: readonly BucketPoint[];
  p90: readonly BucketPoint[];
  messages: Messages["charts"];
  intlLocale: string;
}

export const ScoreTrend = ({ median, p90, messages, intlLocale }: ScoreTrendProps): JSX.Element => (
  <TimeSeriesChart
    first={median}
    second={p90}
    names={[messages.seriesMedian, messages.seriesP90]}
    title={messages.scoreTrendTitle}
    description={messages.scoreTrendDescription}
    messages={messages}
    intlLocale={intlLocale}
  />
);
