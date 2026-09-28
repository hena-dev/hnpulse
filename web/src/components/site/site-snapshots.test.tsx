import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deferred, metaFixture, snapshotFixture } from "../../data/snapshot.test.fixture.ts";
import { prepareSnapshot } from "../../data/snapshot.ts";
import { getMessages } from "../../lib/i18n/messages.ts";
import { SiteApp } from "./site-app.tsx";

vi.mock("../dashboard/detail-charts.tsx", () => ({
  DetailCharts: ({ series }: { series: { stories: { value: number }[] } }) => (
    <div data-testid="chart">{series.stories[0]?.value}</div>
  ),
}));
const latest = prepareSnapshot(snapshotFixture("2025-01-17", "final", 999)).ranges;
const renderApp = (meta = metaFixture) =>
  render(
    <SiteApp
      initialRange="1w"
      locale="en"
      messages={getMessages("en")}
      ranges={latest}
      meta={meta}
    />,
  );
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/1w");
});
describe("dated dashboard navigation", () => {
  it("hides the picker without metadata and normalizes invalid/duplicate dates", () => {
    window.history.replaceState(null, "", "/1w?date=bad&keep=1#anchor");
    const { snapshots: _, ...meta } = metaFixture;
    renderApp(meta);
    expect(screen.queryByRole("button", { name: /Snapshot date/ })).toBeNull();
    expect(window.location.search).toBe("?keep=1");
    expect(window.location.hash).toBe("#anchor");
    expect(screen.getByTestId("chart")).toHaveTextContent("999");
  });
  it("shows no latest values while loading/error, retries, and preserves date across range/locale changes", async () => {
    window.history.replaceState(null, "", "/1w?date=2025-01-10");
    const request = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(request.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshotFixture())));
    vi.stubGlobal("fetch", fetcher);
    renderApp();
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(screen.getByRole("link", { name: "1m" })).toHaveAttribute("href", "/1m?date=2025-01-10");
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await act(async () => request.resolve(new Response("", { status: 503 })));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this snapshot.");
    expect(screen.queryByTestId("chart")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "1m" }));
    expect(window.location.search).toBe("?date=2025-01-10");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByTestId("chart")).toHaveTextContent("42"));
    expect(
      screen.queryByText(getMessages("en").dashboard.asOf.replace("{date}", "Jan 10, 2025")),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Snapshot date: Jan 10, 2025" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fa" } });
    expect(window.location.pathname + window.location.search).toBe("/fa?date=2025-01-10");
    expect(document.documentElement.dir).toBe("rtl");
    await waitFor(() => expect(document.title).toBe(getMessages("fa").metadata.title));
    expect(screen.getByRole("link", { name: "HN Pulse" })).toHaveAttribute("href", "/fa");
    fireEvent.click(screen.getByRole("link", { name: "HN Pulse" }));
    expect(window.location.search).toBe("");
    expect(screen.getByTestId("chart")).toHaveTextContent("999");
  });
  it("handles popstate during inflight requests and Latest clears just the date selection", async () => {
    window.history.replaceState(null, "", "/1w?date=2025-01-12");
    const old = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(snapshotFixture("2025-01-13", "provisional", 13))),
      );
    vi.stubGlobal("fetch", fetcher);
    renderApp();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    act(() => {
      window.history.pushState(null, "", "/3m?date=2025-01-13");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(screen.getByTestId("chart")).toHaveTextContent("13"));
    await act(async () =>
      old.resolve(new Response(JSON.stringify(snapshotFixture("2025-01-12", "provisional", 12)))),
    );
    expect(screen.getByTestId("chart")).toHaveTextContent("13");
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(window.location.pathname).toBe("/3m");
    expect(window.location.search).toBe("");
    expect(screen.getByTestId("chart")).toHaveTextContent("999");
  });
  it("uses the fetched final status after stale provisional metadata returns 404", async () => {
    window.history.replaceState(null, "", "/1w?date=2025-01-16");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(snapshotFixture("2025-01-16", "final", 16))),
        ),
    );
    renderApp();
    expect(screen.getByText(/Estimated finalization/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("chart")).toHaveTextContent("16"));
    expect(screen.queryByText(/Estimated finalization/)).toBeNull();
    expect(window.location.search).toBe("?date=2025-01-16");
  });
});
