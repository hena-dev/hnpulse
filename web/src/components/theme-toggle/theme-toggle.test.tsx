import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle.tsx";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});
afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("renders an accessible button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles the .dark class on <html> and persists preference", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("hnpulse.theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("hnpulse.theme")).toBe("light");
  });

  it("respects an existing .dark on first render", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("hydrates without a mismatch when the early theme script selects stored dark mode", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeToggle />);
    document.body.append(container);
    document.documentElement.classList.add("dark");
    localStorage.setItem("hnpulse.theme", "dark");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <ThemeToggle />);
      });
      expect(errors).not.toHaveBeenCalled();
      expect(container.querySelectorAll("button span[aria-hidden='true']")).toHaveLength(2);
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("hnpulse.theme")).toBe("dark");
      await act(async () => {
        container.querySelector("button")?.click();
      });
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem("hnpulse.theme")).toBe("light");
      await act(async () => root?.unmount());
    } finally {
      errors.mockRestore();
      container.remove();
    }
  });

  it("ignores localStorage failures (private mode)", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(() => render(<ThemeToggle />)).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});
