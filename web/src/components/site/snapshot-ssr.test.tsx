import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metaFixture, snapshotFixture } from "../../data/snapshot.test.fixture.ts";
import { prepareSnapshot } from "../../data/snapshot.ts";
import { getMessages } from "../../lib/i18n/messages.ts";
import { SiteApp } from "./site-app.tsx";

vi.mock("../dashboard/detail-charts.tsx", () => ({ DetailCharts: () => <div>Latest charts</div> }));
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const layout = readFileSync(resolve(sourceRoot, "layouts/base.astro"), "utf8");
afterEach(() => {
  document.documentElement.removeAttribute("data-dated-link");
  window.history.replaceState(null, "", "/1w");
});
describe("static snapshot protection", () => {
  it.each([
    "?date=2025-01-10",
    "?date=invalid",
    "?date=",
  ])("hides latest HTML before hydration for %s indefinitely", (search) => {
    window.history.replaceState(null, "", `/1w${search}`);
    const script = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1] ?? "";
    const css = layout.match(/<style is:global>([\s\S]*?)<\/style>/)?.[1] ?? "";
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    const host = document.createElement("div");
    document.body.append(host);
    host.innerHTML = renderToString(
      <SiteApp
        initialRange="1w"
        locale="en"
        messages={getMessages("en")}
        ranges={prepareSnapshot(snapshotFixture()).ranges}
        meta={metaFixture}
      />,
    );
    const values = host.querySelector("[data-dashboard-values]") as HTMLElement;
    expect(values).toHaveTextContent("Latest charts");
    expect(getComputedStyle(values).display).not.toBe("none");
    new Function(script)();
    expect(getComputedStyle(values).display).toBe("none");
    expect(script).not.toMatch(/setTimeout|setInterval/);
    values.setAttribute("data-date-ready", "true");
    expect(getComputedStyle(values).display).not.toBe("none");
    host.remove();
    style.remove();
  });
  it("preserves queries and fragments in root locale redirects", () => {
    const root = readFileSync(resolve(sourceRoot, "pages/index.astro"), "utf8");
    const script = root.match(/define:vars=[^\n]+\n\s*>\s*([\s\S]*?)<\/script>/)?.[1] ?? "";
    const replace = vi.fn();
    const run = new Function(
      "window",
      "navigator",
      "localStorage",
      "fallbackPath",
      "traditionalChinesePath",
      "storageKey",
      "redirectTargets",
      script,
    );
    run(
      { location: { search: "?date=2025-01-10", hash: "#top", replace } },
      { languages: ["fa"] },
      { getItem: () => null },
      "/1m",
      "/zh-tw",
      "locale",
      [{ aliases: ["fa"], target: "/fa" }],
    );
    expect(replace).toHaveBeenCalledWith("/fa?date=2025-01-10#top");
  });
});
