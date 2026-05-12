import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { METRIC_KEYS, type MetaJson } from "../../data/types.ts";
import type { DashboardDataByRange } from "../../lib/dashboard-data.ts";
import { getMessages } from "../../lib/i18n/messages.ts";
import { RANGE_IDS, type RangeId } from "../../lib/range/range.ts";
import { SiteApp } from "./site-app.tsx";

vi.mock("../dashboard/detail-charts.tsx", () => ({
  DetailCharts: ({ series }: { series: { stories: readonly { value: number }[] } }) => (
    <div data-testid="charts">{series.stories[0]?.value}</div>
  ),
}));

const meta: MetaJson = {
  schemaVersion: 1,
  lastUpdated: "2026-05-06T16:57:22.197Z",
  dataAsOf: "2026-05-05",
  windowStart: "2024-05-06",
  windowEnd: "2026-05-05",
  kpisFile: "/data/kpis.0000000.json",
  buildSha: "test",
  pipelineVersion: "test",
  dataSources: ["bigquery"],
  stabilizationDays: 7,
  provisionalFrom: "2026-04-29",
};

const ranges = Object.fromEntries(
  RANGE_IDS.map((range, i) => [
    range,
    {
      summaries: Object.fromEntries(
        METRIC_KEYS.map((key) => [key, { value: i + 1, delta: null, sparkline: [i + 1] }]),
      ),
      topDomain: null,
      detailSeries: {
        stories: [{ date: "2026-05-05", value: i + 1 }],
        comments: [],
        activeCommenters: [],
        activeSubmitters: [],
        medianScore: [],
        p90Score: [],
      },
      topDomains: [],
    },
  ]),
) as unknown as DashboardDataByRange;

const renderApp = (initialRange: RangeId = "1w") =>
  render(
    <SiteApp
      initialRange={initialRange}
      locale="en"
      messages={getMessages("en")}
      ranges={ranges}
      meta={meta}
    />,
  );

const renderLocalizedApp = (initialRange: RangeId = "1w") =>
  render(
    <SiteApp
      initialRange={initialRange}
      locale="ko"
      messages={getMessages("ko")}
      ranges={ranges}
      meta={meta}
    />,
  );

describe("SiteApp", () => {
  it("updates dashboard ranges without leaving the page", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("1w");

    screen.getByRole("link", { name: "1m" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/1m"));
    expect(screen.getByRole("link", { name: "1m" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(screen.getByTestId("charts")).toHaveTextContent("2"));
  });

  it("handles dashboard header navigation", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("1w");

    screen.getByRole("link", { name: "HN Pulse" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/1m"));
    expect(screen.getByRole("link", { name: "1m" })).toHaveAttribute("aria-current", "page");

    screen.getByRole("link", { name: "HN Pulse" }).click();

    expect(window.location.pathname).toBe("/1m");
  });

  it("keeps localized range navigation under the locale prefix", async () => {
    window.history.replaceState(null, "", "/ko/1w");
    renderLocalizedApp("1w");

    screen.getByRole("link", { name: "1개월" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/ko"));
    expect(screen.getByRole("link", { name: "1개월" })).toHaveAttribute("aria-current", "page");
  });

  it("allows modified header clicks to skip SPA handling", () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("1w");
    const homeLink = screen.getByRole("link", { name: "HN Pulse" });
    homeLink.addEventListener("click", (event) => event.preventDefault(), { once: true });

    fireEvent.click(homeLink, { metaKey: true });

    expect(window.location.pathname).toBe("/1w");
  });

  it("responds to browser back and forward popstate changes", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("1w");

    window.history.pushState(null, "", "/2y");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "2y" })).toHaveAttribute("aria-current", "page"),
    );

    window.history.pushState(null, "", "/not-a-range");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "2y" })).toHaveAttribute("aria-current", "page"),
    );
  });
});
