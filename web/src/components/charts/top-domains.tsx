import { barX, defineChart, text } from "@tanstack/charts";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react/core";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { portal } from "@tanstack/charts/tooltip/portal";
import { type JSX, useId, useMemo } from "react";
import type { TopDomainEntry } from "../../data/types.ts";
import { formatInteger, formatPercent } from "../../lib/format/number.ts";
import { formatMessage } from "../../lib/i18n/format-message.ts";
import type { Messages } from "../../lib/i18n/messages.ts";
import { ChartContainer } from "./chart-container.tsx";
import { chartAxis, chartRenderer, chartTheme } from "./chart-theme.ts";

export interface TopDomainsChartProps {
  entries: readonly TopDomainEntry[];
  messages: Messages["charts"];
  intlLocale: string;
  ofStories: string;
}

export const TopDomainsChart = ({
  entries,
  messages,
  intlLocale,
  ofStories,
}: TopDomainsChartProps): JSX.Element => {
  const id = useId();
  const definition = useMemo(() => {
    const rows = [...entries].sort((a, b) => b.stories - a.stories).slice(0, 10);
    return defineChart({
      marks: [
        barX(rows, {
          x: "stories",
          y: "name",
          fill: "var(--ts-chart-1)",
          fillOpacity: 0.75,
          radius: { end: 4 },
          inset: 4,
          states: [
            {
              when: { focus: "primary" },
              style: { fillOpacity: 1 },
              transition: { type: "tween", duration: 200 },
            },
          ],
        }),
        decorative(
          text(rows, {
            x: "stories",
            y: "name",
            text: (row) => formatInteger(row.stories, intlLocale),
            anchor: "start",
            dx: 6,
            fontSize: 11,
            fill: "var(--muted-foreground)",
          }),
        ),
      ],
      scales: {
        x: { scale: scaleLinear, axis: false },
        y: {
          scale: scaleBand,
          axis: {
            ...chartAxis,
            ticks: { size: 0, padding: 10 },
            tickLabels: { fontSize: 11, thin: false },
          },
        },
      },
      theme: chartTheme,
      focus: "nearest-y",
      maxFocusDistance: Number.POSITIVE_INFINITY,
      focusRing: false,
      tooltip: {
        use: tooltip,
        portal,
        className: "detail-chart-tooltip",
        anchor: "point",
        content: (points) => ({
          title: points[0]?.datum.name ?? "",
          rows: points.flatMap((point) => [
            {
              label: messages.seriesStories,
              value: formatInteger(point.datum.stories, intlLocale),
              color: "var(--chart-1)",
            },
            {
              label: formatMessage(ofStories, {
                share: formatPercent(point.datum.share, intlLocale),
              }),
              value: "",
            },
          ]),
        }),
      },
    });
  }, [entries, messages.seriesStories, intlLocale, ofStories]);
  return (
    <ChartContainer
      title={messages.topDomainsTitle}
      description={messages.topDomainsDescription}
      legend={
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="w-4 border-t-2 border-chart-1" />
          {messages.seriesStories}
        </span>
      }
    >
      <Chart
        definition={definition}
        renderer={chartRenderer}
        initialWidth={500}
        height={260}
        idPrefix={`domains-${id}`}
        ariaLabel={messages.topDomainsTitle}
        ariaDescription={messages.topDomainsDescription}
      />
    </ChartContainer>
  );
};
