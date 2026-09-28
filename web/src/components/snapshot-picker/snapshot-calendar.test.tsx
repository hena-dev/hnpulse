import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bounds } from "../../data/snapshot.test.fixture.ts";
import { LOCALE_CONFIGS, LOCALES } from "../../lib/i18n/config.ts";
import { snapshotIntlLocale, snapshotMessages } from "../../lib/snapshots/messages.ts";
import { SnapshotCalendar } from "./snapshot-calendar.tsx";

describe("snapshot calendar", () => {
  it.each(LOCALES)("localizes dropdowns, dates and direction in %s", (locale) => {
    const copy = snapshotMessages(locale);
    const { container } = render(
      <SnapshotCalendar date={null} bounds={bounds} locale={locale} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: copy.month })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: copy.year })).toHaveValue("2025");
    const year = new Intl.DateTimeFormat(snapshotIntlLocale(LOCALE_CONFIGS[locale].intlLocale), {
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date("2025-01-01"));
    expect(screen.getByRole("combobox", { name: copy.year })).toHaveTextContent(year);
    expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute(
      "dir",
      LOCALE_CONFIGS[locale].dir,
    );
    expect(container.querySelectorAll(".snapshot-provisional")).toHaveLength(7);
    expect(
      screen.getAllByRole("button", { name: new RegExp(` · ${copy.provisional}$`) }),
    ).toHaveLength(7);
  });
  it("selects exactly one UTC day and enforces inclusive bounds", () => {
    const onSelect = vi.fn();
    render(<SnapshotCalendar date="2025-01-10" bounds={bounds} locale="en" onSelect={onSelect} />);
    const first = screen.getByRole("button", { name: "Wednesday, January 1, 2025" });
    expect(first).toBeEnabled();
    fireEvent.click(first);
    expect(onSelect).toHaveBeenLastCalledWith("2025-01-01");
    const last = screen.getByRole("button", { name: /Friday, January 17, 2025/ });
    expect(last).toBeEnabled();
    fireEvent.click(last);
    expect(onSelect).toHaveBeenLastCalledWith("2025-01-17");
    expect(screen.getByRole("button", { name: "Saturday, January 18, 2025" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Next month" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
  it("highlights the latest published day and allows pinning it", () => {
    const onSelect = vi.fn();
    render(<SnapshotCalendar date={null} bounds={bounds} locale="en" onSelect={onSelect} />);
    const latest = screen.getByRole("button", { name: /Friday, January 17, 2025/ });
    expect(latest).toHaveAttribute("data-selected-single", "true");
    fireEvent.click(latest);
    expect(onSelect).toHaveBeenCalledWith("2025-01-17");
  });
  it("navigates month/year dropdowns and omits provisional markers when all dates are final", () => {
    const { container } = render(
      <SnapshotCalendar
        date="2026-03-01"
        bounds={{ ...bounds, last: "2026-03-02", finalThrough: "2026-03-02" }}
        locale="en"
        onSelect={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "2025" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Month" }), { target: { value: "0" } });
    expect(screen.getByRole("button", { name: "Wednesday, January 1, 2025" })).toBeEnabled();
    expect(container.querySelector(".snapshot-provisional")).toBeNull();
  });
});
