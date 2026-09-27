import type { JSX } from "react";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { TimeSeriesChart } from "./time-series-chart.tsx";

export interface StoriesVsCommentsProps {
  stories: readonly BucketPoint[];
  comments: readonly BucketPoint[];
  messages: Messages["charts"];
  intlLocale: string;
}

export const StoriesVsComments = ({
  stories,
  comments,
  messages,
  intlLocale,
}: StoriesVsCommentsProps): JSX.Element => (
  <TimeSeriesChart
    first={stories}
    second={comments}
    names={[messages.seriesStories, messages.seriesComments]}
    title={messages.storiesVsCommentsTitle}
    description={messages.storiesVsCommentsDescription}
    messages={messages}
    intlLocale={intlLocale}
    stacked
  />
);
