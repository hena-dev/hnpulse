import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bounds } from "../../data/snapshot.test.fixture.ts";
import { SnapshotPicker } from "./snapshot-picker.tsx";

describe("snapshot picker", () => {
  it("loads the calendar on demand and closes after selection", async () => {
    const onChange = vi.fn();
    const props = { bounds, locale: "en" as const, stabilizationDays: 7, onChange };
    render(<SnapshotPicker {...props} date={null} />);
    expect(screen.getByRole("button", { name: "Snapshot date: Latest" })).toHaveTextContent(
      "as of Jan 17, 2025",
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Snapshot date: Latest" }));
      await vi.dynamicImportSettled();
    });
    expect(screen.getByRole("dialog", { name: "Snapshot date" })).toBeInTheDocument();
    const day = await screen.findByRole(
      "button",
      { name: "Friday, January 10, 2025" },
      { timeout: 10000 },
    );
    fireEvent.click(day);
    expect(onChange).toHaveBeenCalledWith("2025-01-10");
    expect(screen.queryByRole("combobox")).toBeNull();
  }, 15000);
  it("shows estimates inside the calendar on provisional dates and clears the selection", async () => {
    const onChange = vi.fn();
    const props = { bounds, locale: "en" as const, stabilizationDays: 7, onChange };
    const { rerender } = render(<SnapshotPicker {...props} date="2025-01-11" />);
    expect(screen.queryByText(/Estimated finalization/)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Snapshot date/ }));
      await vi.dynamicImportSettled();
    });
    expect(screen.getByText(/Estimated finalization/)).toHaveTextContent(
      "Provisional · Estimated finalization: Jan 19, 2025, after a successful update",
    );
    fireEvent.click(screen.getByRole("button", { name: /Snapshot date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(onChange).toHaveBeenCalledWith(null);
    rerender(<SnapshotPicker {...props} date="2025-01-10" />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<SnapshotPicker {...props} date="2025-01-11" status="final" />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Snapshot date/ }));
    expect(screen.getByRole("button", { name: "Saturday, January 11, 2025" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /January 11, 2025 · Provisional/ })).toBeNull();
    rerender(<SnapshotPicker {...props} date="2025-01-10" status="final" />);
    expect(screen.queryByText(/Estimated finalization/)).toBeNull();
    rerender(<SnapshotPicker {...props} date={null} status="final" />);
    expect(screen.getByRole("button", { name: "Snapshot date: Latest" })).toBeInTheDocument();
  });
});
