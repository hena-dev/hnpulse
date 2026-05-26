import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "../../lib/i18n/config.ts";
import { LanguageSwitcher } from "./language-switcher.tsx";

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageSwitcher", () => {
  it("renders the active locale", () => {
    render(<LanguageSwitcher locale="ko" />);

    expect(screen.getByLabelText("Language")).toHaveValue("ko");
  });

  it("saves the selected locale and reports the change", () => {
    const changes: string[] = [];
    render(<LanguageSwitcher locale="ko" onLocaleChange={(locale) => changes.push(locale)} />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ja" } });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ja");
    expect(changes).toEqual(["ja"]);
  });

  it("does not report a change when the selected locale is unchanged", () => {
    const changes: string[] = [];
    render(<LanguageSwitcher locale="ko" onLocaleChange={(locale) => changes.push(locale)} />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ko" } });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ko");
    expect(changes).toEqual([]);
  });

  it("still reports changes when storage is unavailable", () => {
    const original = Storage.prototype.setItem;
    const changes: string[] = [];
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      render(<LanguageSwitcher locale="ko" onLocaleChange={(locale) => changes.push(locale)} />);
      fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });

      expect(changes).toEqual(["es"]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
