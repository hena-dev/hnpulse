import type { JSX } from "react";

export const AboutContent = (): JSX.Element => (
  <main className="mx-auto max-w-6xl px-4 py-6">
    <article className="prose prose-invert prose-sm max-w-none">
      <h1>About HN Pulse</h1>
      <p>
        HN Pulse is a single-page public analytics dashboard showing the long-term vitals of Hacker
        News — updated daily, hosted at <code>hnpulse.hena.dev</code>, designed to operate at $0
        forever.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        All metrics are derived from the public dataset{" "}
        <a
          href="https://console.cloud.google.com/marketplace/product/y-combinator/hacker-news"
          target="_blank"
          rel="noopener noreferrer"
        >
          <code>bigquery-public-data.hacker_news.full</code>
        </a>
        .
      </p>

      <h2>How fresh it is</h2>
      <p>
        The pipeline runs daily at 14:00 UTC, ~1 hour after the BigQuery public dataset's own daily
        refresh (~13:00 UTC). It performs a freshness check and exits cleanly if the source isn't
        ready, retrying on the next cron tick.
      </p>

      <h2>What each KPI means</h2>
      <ul>
        <li>
          <strong>Stories per day</strong> — Avg story submissions per UTC day, excluding
          deleted/dead.
        </li>
        <li>
          <strong>Comments per day</strong> — Avg comments per UTC day, excluding deleted/dead.
        </li>
        <li>
          <strong>Active commenters / submitters</strong> — Distinct authors per day.
        </li>
        <li>
          <strong>Median / p90 story score</strong> — Daily quantile estimates over stories.
        </li>
        <li>
          <strong>Comments per story</strong> — SUM(comments) / SUM(stories) over the range.
        </li>
        <li>
          <strong>Success rate (≥100)</strong> — Stories scoring ≥100 / all stories.
        </li>
        <li>
          <strong>Top domains share</strong> — eTLD+1 of stories' URL.
        </li>
        <li>
          <strong>Show HN / Ask HN / Jobs</strong> — counted by title prefix or item type.
        </li>
        <li>
          <strong>Dead/flagged ratio</strong> — Items with <code>dead</code> or <code>deleted</code>
          .
        </li>
      </ul>

      <h2>Domain extraction</h2>
      <p>
        Registrable domain via the{" "}
        <a href="https://publicsuffix.org/" target="_blank" rel="noopener noreferrer">
          Public Suffix List
        </a>{" "}
        (eTLD+1). Subdomains and <code>www.</code> are stripped. Stories without a URL (Ask HN, Show
        HN text-only) are excluded from domain stats.
      </p>

      <h2>Period comparison</h2>
      <p>
        For range N days, delta compares the trailing N days against the prior N days. Formula:
        <code>(current − previous) / previous · 100</code>. When the previous window is zero, a
        positive current shows as <code>+∞</code>.
      </p>

      <h2>Open data</h2>
      <ul>
        <li>
          <a href="/data/kpis-current.json">
            Latest <code>kpis.json</code>
          </a>
        </li>
        <li>
          <a href="/data/meta.json">
            <code>meta.json</code>
          </a>
        </li>
        <li>
          <a
            href="https://github.com/hena-dev/hnpulse/releases/tag/data-snapshot"
            target="_blank"
            rel="noopener noreferrer"
          >
            Daily Parquet snapshots (GitHub Release)
          </a>
        </li>
      </ul>

      <h2>Source code & license</h2>
      <p>
        <a href="https://github.com/hena-dev/hnpulse" target="_blank" rel="noopener noreferrer">
          github.com/hena-dev/hnpulse
        </a>{" "}
        — MIT.
      </p>

      <h2>Privacy</h2>
      <p>Cloudflare Web Analytics, no cookies, no PII.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hi@hena.dev">hi@hena.dev</a>
      </p>
    </article>
  </main>
);
