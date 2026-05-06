import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RangeSelector } from "./range-selector.tsx";

describe("RangeSelector", () => {
  it("renders one button per range id", () => {
    render(<RangeSelector value="1m" onChange={() => {}} />);
    for (const id of ["1w", "1m", "3m", "6m", "1y", "2y"]) {
      expect(screen.getByRole("button", { name: id })).toBeInTheDocument();
    }
  });

  it("highlights the selected range with aria-pressed=true", () => {
    render(<RangeSelector value="3m" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "3m" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "1w" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the chosen range", () => {
    const onChange = vi.fn();
    render(<RangeSelector value="1m" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "6m" }));
    expect(onChange).toHaveBeenCalledWith("6m");
  });
});
