import type { JSX, MouseEvent } from "react";
import type { RangeId } from "../../lib/range/range.ts";
import { ThemeToggle } from "../theme-toggle/theme-toggle.tsx";

export type SitePage = "dashboard" | "about";
export type SiteHref = "/about" | `/${RangeId}`;

export interface SiteHeaderProps {
  page: SitePage;
  onNavigate: (href: SiteHref) => (event: MouseEvent<HTMLAnchorElement>) => void;
}

export const SiteHeader = ({ page, onNavigate }: SiteHeaderProps): JSX.Element => (
  <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
    <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
      <a href="/1m" onClick={onNavigate("/1m")} className="font-semibold text-lg">
        HN Pulse
      </a>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {page === "about" ? (
          <a
            href="/1m"
            onClick={onNavigate("/1m")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </a>
        ) : (
          <>
            <a
              href="https://github.com/hena-dev/hnpulse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="/about"
              onClick={onNavigate("/about")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </a>
          </>
        )}
      </div>
    </div>
  </header>
);
