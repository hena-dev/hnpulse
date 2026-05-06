import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopDomainKpiEntry } from "../../lib/kpi/catalog.ts";
import { TopDomainCard } from "./top-domain-card.tsx";

const entry: TopDomainKpiEntry = {
  id: "topDomain",
  kind: "topDomain",
  label: "Top domain",
  description: "Most-submitted domain",
};

describe("TopDomainCard", () => {
  it("renders the domain name + share + submission count", () => {
    render(
      <TopDomainCard entry={entry} top={{ name: "github.com", stories: 41, share: 0.0532 }} />,
    );
    expect(screen.getByText("github.com")).toBeInTheDocument();
    expect(screen.getByText(/5\.3% of stories/)).toBeInTheDocument();
    expect(screen.getByText(/41 submissions/)).toBeInTheDocument();
  });

  it("renders — when top is null", () => {
    render(<TopDomainCard entry={entry} top={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
