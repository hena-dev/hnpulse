import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DualKpiEntry } from "../../lib/kpi/catalog.ts";
import { DualCard } from "./dual-card.tsx";

const entry: DualKpiEntry = {
  id: "score",
  kind: "dual",
  primaryKey: "medianScore",
  secondaryKey: "p90Score",
  label: "Story score",
  description: "Median + p90",
  primaryLabel: "median",
  secondaryLabel: "p90",
  format: "count",
};

describe("DualCard", () => {
  it("renders both values with their labels", () => {
    render(
      <DualCard
        entry={entry}
        primaryValue={11}
        secondaryValue={80}
        primaryDelta={0.05}
        primarySparkline={[1, 2]}
        secondarySparkline={[5, 6]}
      />,
    );
    expect(screen.getByText("11.0")).toBeInTheDocument();
    expect(screen.getByText("80.0")).toBeInTheDocument();
    expect(screen.getByText("median")).toBeInTheDocument();
    expect(screen.getByText("p90")).toBeInTheDocument();
  });

  it("renders — when primaryDelta is null", () => {
    render(
      <DualCard
        entry={entry}
        primaryValue={11}
        secondaryValue={80}
        primaryDelta={null}
        primarySparkline={[1]}
        secondarySparkline={[1]}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies up-color when primaryDelta > 0", () => {
    const { container } = render(
      <DualCard
        entry={entry}
        primaryValue={1}
        secondaryValue={1}
        primaryDelta={0.1}
        primarySparkline={[1]}
        secondarySparkline={[1]}
      />,
    );
    expect(container.querySelector(".text-emerald-500")).not.toBeNull();
  });

  it("applies down-color when primaryDelta < 0", () => {
    const { container } = render(
      <DualCard
        entry={entry}
        primaryValue={1}
        secondaryValue={1}
        primaryDelta={-0.1}
        primarySparkline={[1]}
        secondarySparkline={[1]}
      />,
    );
    expect(container.querySelector(".text-rose-500")).not.toBeNull();
  });
});
