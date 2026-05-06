import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SingleKpiEntry } from "../../lib/kpi/catalog.ts";
import { SingleCard } from "./single-card.tsx";

const entry: SingleKpiEntry = {
  id: "stories",
  kind: "single",
  key: "stories",
  label: "Stories / day",
  description: "Avg stories",
  format: "count",
};

describe("SingleCard", () => {
  it("renders the label, formatted value and delta", () => {
    render(<SingleCard entry={entry} value={1234} delta={0.052} sparkline={[1, 2, 3]} />);
    expect(screen.getAllByText("Stories / day").length).toBeGreaterThan(0);
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText(/\+5\.2% ▲/)).toBeInTheDocument();
  });

  it("renders a — placeholder when delta is null", () => {
    render(<SingleCard entry={entry} value={1234} delta={null} sparkline={[1, 2]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("includes a sr-only table for accessibility", () => {
    render(<SingleCard entry={entry} value={10} delta={0} sparkline={[1, 2, 3]} />);
    expect(screen.getByRole("table", { hidden: true })).toBeInTheDocument();
  });

  it("uses the secondary modifier when entry.secondary is true", () => {
    const { container } = render(
      <SingleCard entry={{ ...entry, secondary: true }} value={1} delta={0} sparkline={[1]} />,
    );
    expect(container.querySelector('[data-secondary="true"]')).toBeInTheDocument();
  });

  it("renders 'down' delta with rose color class", () => {
    const { container } = render(
      <SingleCard entry={entry} value={10} delta={-0.05} sparkline={[1, 2, 3]} />,
    );
    expect(container.querySelector(".text-rose-500")).not.toBeNull();
  });
});
