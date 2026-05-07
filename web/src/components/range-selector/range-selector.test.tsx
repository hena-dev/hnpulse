import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RangeSelector } from "./range-selector.tsx";

describe("RangeSelector", () => {
  it("renders one link per range id", () => {
    render(<RangeSelector value="1m" />);
    for (const id of ["1w", "1m", "3m", "6m", "1y", "2y"]) {
      expect(screen.getByRole("link", { name: id })).toHaveAttribute("href", `/${id}`);
    }
  });

  it("marks the selected range as the current page", () => {
    render(<RangeSelector value="3m" />);
    expect(screen.getByRole("link", { name: "3m" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1w" })).not.toHaveAttribute("aria-current");
  });
});
