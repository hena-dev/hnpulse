import { type JSX, useCallback, useEffect, useState } from "react";

const THEME_KEY = "hnpulse.theme";

const detect = (): "light" | "dark" => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

export interface ThemeToggleProps {
  ariaLabel?: string;
}

export const ThemeToggle = ({ ariaLabel = "Toggle theme" }: ThemeToggleProps): JSX.Element => {
  const [theme, setTheme] = useState<"light" | "dark">(detect);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-foreground hover:bg-muted"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
};
