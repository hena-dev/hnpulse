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

  it("supports localized range hrefs", () => {
    render(<RangeSelector value="1m" hrefForRange={(range) => `/ko/${range}`} />);
    expect(screen.getByRole("link", { name: "1w" })).toHaveAttribute("href", "/ko/1w");
  });

  it("supports localized range labels", () => {
    render(
      <RangeSelector
        value="1m"
        labels={{
          "1w": "1주",
          "1m": "1개월",
          "3m": "3개월",
          "6m": "6개월",
          "1y": "1년",
          "2y": "2년",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "1주" })).toHaveAttribute("href", "/1w");
  });

  it("marks the selected range as the current page", () => {
    render(<RangeSelector value="3m" />);
    expect(screen.getByRole("link", { name: "3m" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1w" })).not.toHaveAttribute("aria-current");
  });

  it("intercepts plain clicks when a range change handler is provided", () => {
    const calls: string[] = [];
    render(<RangeSelector value="1m" onRangeChange={(range) => calls.push(range)} />);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });

    screen.getByRole("link", { name: "1w" }).dispatchEvent(event);

    expect(calls).toEqual(["1w"]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not intercept modified clicks", () => {
    const calls: string[] = [];
    render(<RangeSelector value="1m" onRangeChange={(range) => calls.push(range)} />);
    const link = screen.getByRole("link", { name: "1w" });
    link.addEventListener("click", (event) => event.preventDefault());

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }));

    expect(calls).toEqual([]);
  });
});
