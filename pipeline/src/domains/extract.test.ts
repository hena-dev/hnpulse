import { describe, expect, it } from "vitest";
import { computeDomainShares, extractRegistrableDomain } from "./extract.ts";

describe("extractRegistrableDomain", () => {
  it("extracts eTLD+1 from a typical https URL", () => {
    expect(extractRegistrableDomain("https://example.com/foo")).toBe("example.com");
  });

  it("strips www.", () => {
    expect(extractRegistrableDomain("https://www.example.com/")).toBe("example.com");
  });

  it("collapses subdomains to eTLD+1", () => {
    expect(extractRegistrableDomain("https://blog.medium.com/foo/bar")).toBe("medium.com");
    expect(extractRegistrableDomain("https://news.ycombinator.com/item?id=1")).toBe(
      "ycombinator.com",
    );
  });

  it("handles country-code TLDs via the public suffix list", () => {
    expect(extractRegistrableDomain("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
  });

  it("lowercases the result", () => {
    expect(extractRegistrableDomain("https://WwW.EXAMPLE.com/")).toBe("example.com");
  });

  it("returns null for null/empty/non-URL input", () => {
    expect(extractRegistrableDomain(null)).toBeNull();
    expect(extractRegistrableDomain("")).toBeNull();
    expect(extractRegistrableDomain("not a url")).toBeNull();
  });

  it("returns null for URLs without a public-suffix-recognised host", () => {
    expect(extractRegistrableDomain("http://localhost/foo")).toBeNull();
    expect(extractRegistrableDomain("http://10.0.0.1/")).toBeNull();
  });
});

describe("computeDomainShares", () => {
  it("returns the top N domains sorted desc by stories", () => {
    const counts = new Map<string, number>([
      ["github.com", 41],
      ["nytimes.com", 23],
      ["medium.com", 5],
    ]);
    const out = computeDomainShares(counts, 100, 10);
    expect(out[0]).toEqual({ name: "github.com", stories: 41, share: 0.41 });
    expect(out[1]).toEqual({ name: "nytimes.com", stories: 23, share: 0.23 });
  });

  it("trims to top N", () => {
    const counts = new Map<string, number>(
      Array.from({ length: 15 }, (_, i) => [`d${i}.com`, 15 - i]),
    );
    expect(computeDomainShares(counts, 120, 10).length).toBe(10);
  });

  it("returns share=0 when total is 0", () => {
    expect(computeDomainShares(new Map([["x.com", 0]]), 0, 10)).toEqual([
      { name: "x.com", stories: 0, share: 0 },
    ]);
  });
});
