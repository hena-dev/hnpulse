import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "../../lib/i18n/config.ts";
import { LanguageSwitcher } from "./language-switcher.tsx";

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageSwitcher", () => {
  it("renders the active locale", () => {
    render(<LanguageSwitcher locale="ko" range="1m" />);

    expect(screen.getByLabelText("Language")).toHaveValue("ko");
  });

  it("saves the selected locale and navigates to the localized range", () => {
    const navigations: string[] = [];
    render(<LanguageSwitcher locale="ko" range="3m" navigate={(href) => navigations.push(href)} />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ja" } });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ja");
    expect(navigations).toEqual(["/ja/3m"]);
  });

  it("saves English preference using the unprefixed URL shape", () => {
    const navigations: string[] = [];
    render(<LanguageSwitcher locale="ko" range="1m" navigate={(href) => navigations.push(href)} />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(navigations).toEqual(["/1m"]);
  });

  it("does not navigate when the selected locale is unchanged", () => {
    const navigations: string[] = [];
    render(<LanguageSwitcher locale="ko" range="1m" navigate={(href) => navigations.push(href)} />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ko" } });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ko");
    expect(navigations).toEqual([]);
  });

  it("still navigates when storage is unavailable", () => {
    const original = Storage.prototype.setItem;
    const navigations: string[] = [];
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      render(
        <LanguageSwitcher locale="ko" range="1w" navigate={(href) => navigations.push(href)} />,
      );
      fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });

      expect(navigations).toEqual(["/es/1w"]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
