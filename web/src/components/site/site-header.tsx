import type { JSX, MouseEvent } from "react";
import { ThemeToggle } from "../theme-toggle/theme-toggle.tsx";

export interface SiteHeaderProps {
  homeHref: string;
  themeToggleLabel: string;
  onHomeNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export const SiteHeader = ({
  homeHref,
  themeToggleLabel,
  onHomeNavigate,
}: SiteHeaderProps): JSX.Element => (
  <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
    <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
      <a
        href={homeHref}
        onClick={onHomeNavigate}
        className="flex items-center gap-2 font-semibold text-lg"
      >
        <img src="/favicon.png" alt="" className="h-6 w-6 rounded-sm" aria-hidden="true" />
        HN Pulse
      </a>
      <div className="flex items-center gap-3">
        <ThemeToggle ariaLabel={themeToggleLabel} />
        <a
          href="https://github.com/hena-dev/hnpulse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </div>
  </header>
);
