import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./sparkline.tsx";

describe("Sparkline", () => {
  it("renders a polyline path", () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} ariaLabel="ok" />);
    const poly = container.querySelector("polyline");
    expect(poly).not.toBeNull();
    expect(poly?.getAttribute("points")).toBeTruthy();
  });

  it("renders nothing visible (but a placeholder) for empty input", () => {
    const { container } = render(<Sparkline values={[]} ariaLabel="empty" />);
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("uses the supplied aria-label on the svg", () => {
    render(<Sparkline values={[1, 2, 3]} ariaLabel="stories sparkline" />);
    expect(screen.getByLabelText("stories sparkline")).toBeInTheDocument();
  });

  it("handles all-equal values without NaN coords", () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} ariaLabel="flat" />);
    const points = container.querySelector("polyline")?.getAttribute("points") ?? "";
    expect(points).not.toContain("NaN");
  });
});
