import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { METRIC_KEYS, type MetaJson } from "../../data/types.ts";
import type { DashboardDataByRange } from "../../lib/dashboard-data.ts";
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

const renderApp = (initialPage: "dashboard" | "about", initialRange: RangeId = "1w") =>
  render(
    <SiteApp initialPage={initialPage} initialRange={initialRange} ranges={ranges} meta={meta} />,
  );

describe("SiteApp", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("updates dashboard ranges without leaving the page", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("dashboard", "1w");

    screen.getByRole("link", { name: "1m" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/1m"));
    expect(screen.getByRole("link", { name: "1m" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(screen.getByTestId("charts")).toHaveTextContent("2"));
  });

  it("switches between dashboard and about without a document navigation", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("dashboard", "1w");

    screen.getByRole("link", { name: "About" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/about"));
    expect(screen.getByRole("heading", { name: "About HN Pulse" })).toBeInTheDocument();

    screen.getByRole("link", { name: "Dashboard" }).click();

    await waitFor(() => expect(window.location.pathname).toBe("/1m"));
    expect(screen.getByRole("link", { name: "1m" })).toHaveAttribute("aria-current", "page");
  });

  it("responds to browser back and forward popstate changes", async () => {
    window.history.replaceState(null, "", "/1w");
    renderApp("dashboard", "1w");

    window.history.pushState(null, "", "/about");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "About HN Pulse" })).toBeInTheDocument(),
    );

    window.history.pushState(null, "", "/2y");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "2y" })).toHaveAttribute("aria-current", "page"),
    );
  });
});
