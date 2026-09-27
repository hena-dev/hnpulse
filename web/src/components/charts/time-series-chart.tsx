import { Chart } from "@tanstack/charts/react/core";
import { type JSX, useId, useMemo, useState } from "react";
import type { Messages } from "../../lib/i18n/messages.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";
import { shouldOfferLogScale } from "../../lib/range/scale.ts";
import { ChartContainer, type YScale } from "./chart-container.tsx";
import { chartRenderer } from "./chart-theme.ts";
import { SeriesLegend } from "./series-legend.tsx";
import { seriesRows } from "./time-series-data.ts";
import { timeSeriesDefinition } from "./time-series-definition.ts";

interface TimeSeriesChartProps {
  first: readonly BucketPoint[];
  second: readonly BucketPoint[];
  names: readonly [string, string];
  title: string;
  description: string;
  messages: Messages["charts"];
  intlLocale: string;
  stacked?: boolean;
}

export const TimeSeriesChart = ({
  first,
  second,
  names,
  title,
  description,
  messages,
  intlLocale,
  stacked = false,
}: TimeSeriesChartProps): JSX.Element => {
  const id = useId();
  const rows = useMemo(() => seriesRows(first, second), [first, second]);
  const offerLog = shouldOfferLogScale(rows.flatMap((row) => [row.a, row.b]));
  const [selectedScale, setScale] = useState<YScale>("linear");
  const scale = offerLog ? selectedScale : "linear";
  const [visible, setVisible] = useState<readonly [boolean, boolean]>([true, true]);
  const [firstName, secondName] = names;
  const definition = useMemo(
    () => timeSeriesDefinition(rows, [firstName, secondName], visible, scale, stacked, intlLocale),
    [rows, firstName, secondName, visible, scale, stacked, intlLocale],
  );
  const toggle = (index: number) =>
    setVisible((current) => {
      const next: [boolean, boolean] = [...current];
      next[index] = !next[index];
      return next.some(Boolean) ? next : current;
    });
  return (
    <ChartContainer
      title={title}
      description={description}
      scaleAriaLabel={messages.scaleAria}
      scaleLabels={{ linear: messages.scaleLinear, log: messages.scaleLog }}
      {...(offerLog ? { scale, onScaleChange: setScale } : {})}
      legend={
        <SeriesLegend names={names} visible={visible} {...(!stacked ? { onToggle: toggle } : {})} />
      }
    >
      <Chart
        definition={definition}
        renderer={chartRenderer}
        initialWidth={500}
        height={260}
        idPrefix={`detail-${id}`}
        ariaLabel={title}
        ariaDescription={description}
      />
    </ChartContainer>
  );
};
