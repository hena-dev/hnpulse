import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

const listeners = new Set<() => void>();

describe("useIsMobile", () => {
  beforeEach(() => {
    listeners.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
      writable: true,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn((_event, listener) => listeners.add(listener)),
        removeEventListener: vi.fn((_event, listener) => listeners.delete(listener)),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks desktop and mobile viewport changes", () => {
    const { result, unmount } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 767;
      for (const listener of listeners) {
        listener();
      }
    });

    expect(result.current).toBe(true);
    expect(listeners.size).toBe(1);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
