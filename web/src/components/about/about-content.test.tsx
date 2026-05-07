import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutContent } from "./about-content.tsx";

describe("AboutContent", () => {
  it("renders the about page content", () => {
    render(<AboutContent />);

    expect(screen.getByRole("heading", { name: "About HN Pulse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kpis\.json/i })).toHaveAttribute(
      "href",
      "/data/kpis-current.json",
    );
  });
});
