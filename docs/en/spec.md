# HN Pulse — Product & Technical Specification

> A single-page public analytics dashboard showing the long-term vitals of Hacker News, updated daily, hosted at **hnpulse.hena.dev**, designed to operate at **$0 forever**.

---

## 1. Project Overview

| Field            | Value |
| ---------------- | ----- |
| Product name     | **HN Pulse** (display) / `hnpulse` (slug) |
| Tagline          | "Hacker News, daily vitals" |
| Production URL   | https://hnpulse.hena.dev |
| Repository       | https://github.com/hena-dev/hnpulse (public, MIT) |
| Owner            | hena-dev (hi@hena.dev) |
| GCP project      | `molu-486406` (reused) |
| Cost target      | **USD $0 forever** (lifetime, no recurring spend) |
| Update cadence   | Once daily at **14:00 UTC** (≈1 h after the BQ public dataset refresh) |
| Data window      | Rolling **last 2 years** (older data discarded) |

The product is a one-page executive-style KPI dashboard that visualizes the most important business/service metrics of Hacker News as a community: submission volume, engagement, audience size, content quality, and source diversity. The dashboard supports configurable time-range views (1w / 1m / 3m / 6m / 1y / 2y) with period-over-period deltas and trend sparklines for each KPI, plus a small set of detailed charts beneath.

> **Why 14:00 UTC?** Direct inspection of `bigquery-public-data.hacker_news.full`'s `lastModifiedTime` shows the daily refresh runs around **13:00 UTC** (observed: 2026-05-03 13:06 UTC). 14:00 UTC gives ~1 hour buffer; the pipeline additionally performs a freshness check (§8.2) and exits gracefully if the source has not yet been refreshed.

---

## 2. Goals & Non-Goals

### 2.1 Goals
1. Surface the long-term trends and current pulse of HN in under 5 seconds of viewing.
2. Stay rigorously within free-tier limits of every service used (GCP/BigQuery, GitHub, Cloudflare).
3. Be fully open source and reproducible.
4. Be fast (LCP < 1.5 s on 3G), accessible, and mobile-first.
5. Survive multi-year operation without manual maintenance beyond credential rotation.

### 2.2 Explicitly Out of Scope (v1)
- No user-level pages or per-user lookups (privacy + scope).
- No real-time / sub-daily updates (no Firebase API polling).
- No NLP / sentiment / text analysis in v1 *(but the raw `text` column **is** persisted to enable future text-based features without re-bootstrap; see §8.3)*.
- No comparisons with other social platforms.
- No PWA / offline support.
- No interactive elements that produce user data (comments, likes, accounts).
- No paid tier, no accounts, ever.
- No Cloudflare Worker runtime code — Workers are used **only** for serving static assets (§10).

---

## 3. Constraints (Hard)

| Constraint                                | Implication |
| ----------------------------------------- | ----------- |
| BigQuery free tier: 1 TB scanned / month  | Full-table scan per run is **17.75 GB** (verified via dry-run, see §8.3). At 1 run/day = ~533 GB/month → **~52% of free tier**, leaves headroom for HN to roughly double. `maxBytesBilled` per query as a hard cap. |
| BigQuery storage free tier: 10 GB         | We never persist data inside BigQuery; raw rows live as Parquet on GitHub Releases |
| GitHub Actions free tier (public repo)    | Unlimited minutes — confirmed safe |
| Cloudflare Workers free plan              | 100k req/day soft limit on Worker invocations — irrelevant because we **do not run a Worker**; only static assets are served, and static assets are unmetered |
| GitHub Releases asset count               | Practical limit ~1000 per release; 730 daily Parquet files fit comfortably |
| GCP billing                               | Billing account attached **only** for budget alerts; budget alarm at **$0.01** + per-query `maxBytesBilled` cap |

---

## 4. User Experience

### 4.1 Page Layout (single page, mobile-first)

```
┌─────────────────────────────────────────────────────────┐
│ [HN Pulse logo]                       [theme] [github] │  <- sticky header
├─────────────────────────────────────────────────────────┤
│ Range: ( 1w  [1m]  3m  6m  1y  2y )       as of: ...   │  <- range selector
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │ Stories │ │Comments │ │Active   │ │Active   │         │  <- KPI grid (4-col desktop,
│ │  /day   │ │ /day    │ │Commenters│ │Submitters│         │     2-col tablet,
│ │  1,234  │ │  9,876  │ │  4,321  │ │  1,098  │         │     1-col mobile)
│ │ +5.2%▲  │ │ −1.1%▼  │ │ +3.4%▲  │ │ +0.8%▲  │         │
│ │ ╱╲╱╲╱╲  │ │ ╲╱╲╱╲╱  │ │ ╱╲╱╱╲╱  │ │ ╱╱╲╱╲╱  │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │Median   │ │Comments │ │Success  │ │Top dom. │         │
│ │Score    │ │/Story   │ │Rate     │ │Share    │         │
│ │ ...     │ │ ...     │ │ ...     │ │ ...     │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │Show HN  │ │Ask HN   │ │Jobs     │                     │
│ │ ...     │ │ ...     │ │ ...     │                     │
│ └─────────┘ └─────────┘ └─────────┘                     │
├─────────────────────────────────────────────────────────┤
│  [ Chart 1: Stories vs Comments  (stacked area) ]       │
│  [ Chart 2: Active users         (line)         ]       │
│  [ Chart 3: Top 10 domains       (h-bar)        ]       │
│  [ Chart 4: Median + p90 score   (line)         ]       │
├─────────────────────────────────────────────────────────┤
│ Built by hena · Repo · last updated 2026-05-04 14:03 UTC│
└─────────────────────────────────────────────────────────┘
```

### 4.2 Range Selector
- Options: **1w, 1m, 3m, 6m, 1y, 2y**.
- **Default: 1m**.
- Selection is reflected in URL query: `?range=6m`.
- Selection persists to `localStorage` as fallback when no query param is present.
- Clicking a range instantly re-renders all KPI numbers, deltas, sparklines, and detail charts (no network round-trip; all data is in `kpis.json`).

### 4.3 Day Boundaries
- All days are **UTC** days (matches HN's unix timestamps; no DST).
- The dashboard never shows partial-day data; the most recent point in any chart is **the most recent complete UTC day** (typically yesterday).
- "1w" = trailing 7 complete UTC days, ending at the most recent complete UTC day.

### 4.4 Time Bucketing in Charts
Auto-selected from selected range:

| Range          | Bucket  |
| -------------- | ------- |
| 1w, 1m, 3m     | daily   |
| 6m, 1y         | weekly  |
| 2y             | monthly |

### 4.5 Y-Axis Scale
- **Linear by default.**
- A **Log toggle** appears only on charts whose values span more than two orders of magnitude in the selected range.

### 4.6 Theme & Accessibility
- Dark default; light theme available via toggle.
- Theme also auto-respects `prefers-color-scheme` on first visit.
- Color tokens follow the **shadcn scaffold defaults** (no custom primary override).
- WCAG AA contrast minimum across both themes.
- Keyboard navigable; charts have ARIA labels and a hidden `<table>` fallback for screen readers and search engines.

---

## 5. KPI Catalog

All KPIs are computed for the selected range and rendered as **{number} + {delta vs. previous equivalent period} + {sparkline mirroring the selected range}**.

| # | KPI                          | Definition |
| - | ---------------------------- | ---------- |
| 1 | **Stories per day**          | COUNT(items WHERE `type='story'` OR `type IN ('poll','pollopt')`) AND NOT `deleted` AND NOT `dead`, grouped by UTC day, then averaged across the selected range. |
| 2 | **Comments per day**         | COUNT(items WHERE `type='comment'`) AND NOT `deleted` AND NOT `dead`. |
| 3 | **Active commenters per day**| COUNT(DISTINCT `by`) WHERE `type='comment'` per UTC day, averaged. (Closest HN proxy to DAU.) |
| 4 | **Active submitters per day**| COUNT(DISTINCT `by`) WHERE `type='story'` per UTC day, averaged. |
| 5 | **Median / p90 story score** | APPROX_QUANTILES(`score`, 100)[50] and [90] over stories in range. Both shown in one card. |
| 6 | **Comments per story**       | SUM(comments) / SUM(stories) — the engagement ratio. Card shows the average value across the range. |
| 7 | **Success rate (≥100)**      | COUNT(stories WHERE `score >= 100`) / COUNT(stories), as a percentage. |
| 8 | **Top domains share**        | Card displays "Top: github.com (5.4%)" — the #1 domain and its share over the selected range. Drill-down list of top 10 lives in the detail chart. |
| 9 | **Show HN**                  | COUNT(stories WHERE `title LIKE 'Show HN:%'`) per day, averaged. |
| 10| **Ask HN**                   | COUNT(stories WHERE `title LIKE 'Ask HN:%'`) per day, averaged. |
| 11| **Jobs**                     | COUNT(items WHERE `type='job'`) per day, averaged. |
| 12| **Dead / flagged ratio** *(secondary card, smaller)* | SUM(items WHERE `deleted OR dead`) / SUM(all items) over range. |

### 5.1 Detail Charts (4)

| Chart | Type              | Data |
| ----- | ----------------- | ---- |
| 1     | Stacked area      | Stories vs. Comments over the selected range. |
| 2     | Line              | Active commenters + active submitters (two series) over the range. |
| 3     | Horizontal bar    | Top 10 domains by story count in range, with share % labels. |
| 4     | Line              | Median + p90 story score over the range (two series). |

### 5.2 Type Handling

| HN `type`           | Handling |
| ------------------- | -------- |
| `story`             | First-class. |
| `comment`           | First-class. |
| `job`               | Separate KPI; not counted in stories. |
| `poll`, `pollopt`   | Folded into stories (very rare). |

### 5.3 Exclusions
- `deleted = true` — excluded from all main KPIs.
- `dead = true` — excluded from all main KPIs.
- Both are surfaced only in the **Dead/flagged ratio** card.

### 5.4 Domain Extraction
- Source: `url` field of stories.
- Algorithm: parse, lowercase, strip `www.`, then take the **registrable domain (eTLD+1)** using the [Public Suffix List](https://publicsuffix.org/) via the `tldts` npm package.
- `https://blog.medium.com/foo` → `medium.com`.
- Stories without a `url` (Ask HN, Show HN text-only) are excluded from domain stats but counted in submission KPIs.

### 5.5 Period-over-Period Delta
For range *N* days, delta compares:
- **Current window**: `[today - N + 1, today]`
- **Previous window**: `[today - 2N + 1, today - N]`
- Formula: `(current - previous) / previous * 100`, displayed with 1 decimal and ▲/▼ glyph.
- If `previous == 0`, show `+∞` for any positive `current`, otherwise `0%`.

---

## 6. Visual Design System

### 6.1 Stack
- Project initialized with:
  ```bash
  bunx --bun shadcn@latest init --preset b4NvEWN8q --base base --template astro
  ```
- **Astro** static site with **React islands** for interactive components.
- **shadcn/ui (Base variant)** — using `base-ui` primitives (not Radix). All shadcn components installed via:
  ```bash
  bunx --bun shadcn@latest add --all
  ```
- **Tailwind v4** (default in template).
- **Bun** as package manager and runtime.

### 6.2 Charts
- **shadcn Chart component** (Base variant): https://ui.shadcn.com/docs/components/base/chart
  - Built on Recharts under the hood.
  - Used for sparklines and detail charts alike.
- Sparklines: minimal Recharts `<LineChart>` with no axes or tooltips.
- Detail charts: full Recharts `<AreaChart>`, `<LineChart>`, `<BarChart>`.
- All charts respect the active theme via shadcn chart CSS variables.

### 6.3 Color Tokens
- Use shadcn theme tokens **as scaffolded** — no `--primary` override, no custom brand color injected into the design system.
- Positive delta: `text-emerald-500` (light) / `text-emerald-400` (dark).
- Negative delta: `text-rose-500` / `text-rose-400`.

### 6.4 Typography
- Default shadcn system font stack (Geist Sans + Geist Mono if template ships them).

### 6.5 Branding
- Wordmark "**HN Pulse**" rendered in the default foreground color (no special brand color injected into the page).
- The brand color (HN Orange) is carried only by **`favicon.png`** — a single 512×512 PNG used as favicon and Apple touch icon. Browsers downscale as needed.
- Static OG image: `1200×630` PNG, includes wordmark + tagline. Generated **once at design time**, committed to repo as `og.png`.

---

## 7. Information Architecture

| Path        | Purpose |
| ----------- | ------- |
| `/`         | The dashboard (the page described in §4). |
| `/about`    | Methodology page: data source, KPI definitions, refresh schedule, license, repo link. |

`/about` is a static MD file rendered via Astro. It mirrors §5 of this spec in user-facing language and carries direct links to:
- The HN BigQuery public dataset.
- The current `kpis.json` and `meta.json` for power users.
- The GitHub release containing the daily Parquet snapshots.

---

## 8. Data Pipeline Architecture

### 8.1 High-level flow (daily)

```
                                ┌──────────────────────────────────────┐
                                │  GitHub Actions cron (14:00 UTC)     │
                                └──────────────────────────────────────┘
                                                │
                                                ▼
                ┌────────────────────────────────────────────────────────┐
                │  pipeline/ (Bun + TypeScript)                          │
                │                                                        │
                │  0. Freshness check: query MAX(timestamp) from BQ.     │
                │     If source is not yet refreshed for today, exit 0.  │
                │     Next cron will pick up automatically.              │
                │                                                        │
                │  1. Determine mode: bootstrap vs incremental           │
                │     (mode = "bootstrap" if no prior parquet in release)│
                │                                                        │
                │  2. Query BigQuery hacker_news.full                    │
                │     - bootstrap: WHERE timestamp >= now - 730 days     │
                │     - incremental: WHERE timestamp >= max - 7 day overlap │
                │     - SELECT *  (no column pruning — keep raw text)    │
                │     - maxBytesBilled cap enforced per query            │
                │                                                        │
                │  3. Write Parquet for each affected UTC day            │
                │     items-YYYY-MM-DD.parquet                           │
                │                                                        │
                │  4. Upload new/changed Parquet to GH Release           │
                │     `data-snapshot` (single rolling release)           │
                │     Delete assets older than 730 days                  │
                │                                                        │
                │  5. Download all Parquet files in window (~730)        │
                │                                                        │
                │  6. Run DuckDB CLI over local Parquet glob             │
                │     - Compute all daily metrics                        │
                │     - Dedup by id (idempotent)                         │
                │     - Emit kpis.<sha>.json + meta.json                 │
                │                                                        │
                │  7. Validate: each metric within 10× of 7-day median   │
                │     - On failure: abort, do not commit, exit non-zero  │
                │                                                        │
                │  8. Write JSON to /web/public/data/                    │
                │     - Update HTML to reference new hashed filename     │
                │                                                        │
                │  9. git commit `chore(data): YYYY-MM-DD [skip ci]`     │
                │     git push                                           │
                │                                                        │
                │ 10. wrangler deploy --env production                   │
                │     (deploys static assets only; no Worker code)       │
                │                                                        │
                └────────────────────────────────────────────────────────┘
```

### 8.2 Bootstrap vs Incremental Logic

Single workflow, single code path, conditional behavior:

```ts
// 0. Freshness check
const [{ max_ts }] = await bq.query(`
  SELECT MAX(timestamp) AS max_ts
  FROM \`bigquery-public-data.hacker_news.full\`
`);
const expectedFreshUntil = new Date();
expectedFreshUntil.setUTCHours(0, 0, 0, 0);                 // start of today UTC
expectedFreshUntil.setUTCDate(expectedFreshUntil.getUTCDate() - 1);  // we expect data through "yesterday"
if (new Date(max_ts) < expectedFreshUntil) {
  console.log("BQ source not yet refreshed; exiting cleanly.");
  process.exit(0);                                          // next cron will retry
}

// 1. Mode
const release = await gh.getRelease("data-snapshot");
const existingParquets = release.assets.filter(a => a.name.startsWith("items-"));
const mode = existingParquets.length === 0 ? "bootstrap" : "incremental";

const since =
  mode === "bootstrap"
    ? Date.now() - 730 * 86400 * 1000
    : maxTimestampInExisting - 7 * 86400 * 1000;            // 7-day overlap

// 2. Query — full row, no column pruning
const rows = await bq.query(`
  SELECT *
  FROM \`bigquery-public-data.hacker_news.full\`
  WHERE timestamp >= TIMESTAMP_SECONDS(@since)
`, {
  since: Math.floor(since / 1000),
  maxBytesBilled: 50 * 1024 * 1024 * 1024,                  // 50 GB cap
});
```

The 7-day overlap defends against late-arriving rows in the public dataset; the dedup-by-id step makes re-ingestion safe.

### 8.3 BigQuery Query Profile

- **Source table**: `bigquery-public-data.hacker_news.full`
  - Verified state (queried 2026-05-03): `numRows = 47,949,041`, `numBytes = 17.75 GB`, **not partitioned, not clustered**.
  - Schema (14 columns): `title, url, text, dead, by, score, time, timestamp, type, id, parent, descendants, ranking, deleted`.
- **Column policy**: **`SELECT *`** — we keep **every column including `text`** so future use cases (NLP, search, full-text trends) can be built on top of the same Parquet snapshot without re-bootstrapping.
- **Bytes scanned per run** (verified via `dryRun=true`):
  - Full-table `SELECT *` → **17.75 GB**.
  - `WHERE timestamp >= ...` does **not** reduce scan (table is not partitioned).
  - The 7-day overlap and 730-day bootstrap hit the same 17.75 GB scan; only the result rows transferred differ.
- **Estimated monthly scan**: **~533 GB / month** at 1 run/day → ~52 % of the 1 TB free tier. Headroom for ~1.9× growth before action is needed.
- **`maxBytesBilled`** set to **50 GB per query** as a hard cap. Any query exceeding this fails fast and is **not** charged.
- **Future cost lever** (if HN doubles): switch to `WHERE timestamp >= ... AND _PARTITIONTIME ...` against a self-maintained partitioned mirror, or fall back to incremental Firebase API ingestion. Out of scope for v1.

### 8.4 Storage Layout

#### GitHub Release `data-snapshot`
- Single rolling release tagged `data-snapshot`.
- Assets: `items-YYYY-MM-DD.parquet` (one per UTC day).
- Each ~5–8 MB compressed (full row including `text` column).
- Pipeline daily:
  - Adds today's new Parquet asset.
  - Updates today/recent days if 7-day overlap pulled changes.
  - Deletes any asset whose date < `today - 730d`.
- Asset count steady-state: ~730 (well under GH's practical limit).
- Total release size steady-state: ~4–6 GB.

#### Repo `/web/public/data/`
- `kpis.<sha>.json` — daily-granular series for all KPIs covering full 730-day window.
- `kpis-current.json` — symlink/copy of latest hashed file (for `/about` page raw download link).
- `meta.json` — non-hashed, small, includes pointer to current `kpis.<sha>.json` filename.

### 8.5 DuckDB Aggregation
- Read all Parquet files via glob:
  ```sql
  CREATE VIEW items AS
  SELECT * FROM read_parquet('./tmp/items-*.parquet') ;
  ```
- Run a single SQL script computing all daily aggregates in one pass (one `GROUP BY date_trunc('day', timestamp)`).
- Use `SELECT DISTINCT id` or `QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) = 1` for dedup.
- Emit JSON via `COPY (...) TO 'kpis.json' (FORMAT JSON, ARRAY true);` then post-process in TS to add `schemaVersion`, hash filename, and write `meta.json`.

### 8.6 Validation Gate
Before any commit:
1. For each daily metric in the new output, compute the ratio against the 7-day median **excluding the new value**.
2. If `ratio > 10×` or `ratio < 0.1×` for **any** metric, abort:
   - Pipeline exits with a non-zero status.
   - GHA emails the repo owner.
   - No new JSON is committed; site continues to serve the previous good data until the issue is resolved.

---

## 9. Frontend Implementation

### 9.1 Build & Bundle
- Astro static output (`output: 'static'`).
- React islands hydrated only where needed (range selector, theme toggle, chart components).
- Tailwind v4 via the official Astro integration.
- Vite (bundled with Astro) handles JSON content-hashing via `import.meta.glob` of `data/kpis.*.json`.
- Bundle target: **JS < 150 KB gzipped** total across all islands.

### 9.2 Data Loading
- Build-time: `meta.json` is read at build time; current `kpis.<sha>.json` filename baked into HTML as `<link rel="preload" as="fetch" href="/data/kpis.<sha>.json">`.
- Runtime: a single `fetch('/data/kpis.<sha>.json')` call on first paint of the dashboard.
- All range switching is client-side filtering — no extra requests.

### 9.3 URL State
- `?range=<id>` where `id ∈ {1w,1m,3m,6m,1y,2y}`.
- Default 1m if no param.
- `localStorage.hnpulse.range` written on each change; read only when no `?range` is present.

### 9.4 Performance Budget (enforced in CI)
| Metric                | Target |
| --------------------- | ------ |
| LCP (3G Fast)         | < 1.5 s |
| CLS                   | < 0.05 |
| Total JS (gz)         | < 150 KB |
| Total CSS (gz)        | < 30 KB |
| Lighthouse all        | ≥ 95 |

Lighthouse CI runs on every PR; failures block merge.

### 9.5 Accessibility
- All interactive elements keyboard-reachable in document order.
- ARIA labels on every chart (`role="img" aria-label="..."`).
- Each chart accompanied by an `<sr-only>` `<table>` of the underlying numbers (also good for SEO).
- Color is never the sole carrier of information (delta arrows are also glyphs).

### 9.6 Caching Headers (Cloudflare)
- Hashed assets (`/data/kpis.*.json`, `/_astro/*`):
  `Cache-Control: public, max-age=31536000, immutable`
- HTML and `meta.json`:
  `Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400`

---

## 10. Hosting & Deployment

### 10.1 Cloudflare Workers — Static Assets Only
- Deployment via `wrangler` configured in `wrangler.jsonc`.
- Uses the modern **Workers Static Assets** feature in **assets-only mode**: there is **no Worker script**, no `main` entry, no runtime code on Cloudflare. The Worker platform is used purely as a CDN for the Astro `dist/` output.
- Custom domain: `hnpulse.hena.dev` attached via Cloudflare DNS (assumes `hena.dev` is on Cloudflare).
- HTTPS, HTTP/3, Brotli, and HSTS are enabled at the Cloudflare zone level (dashboard configuration), not via Worker code.

### 10.2 `wrangler.jsonc` skeleton

```jsonc
{
  "$schema": "https://unpkg.com/wrangler/config-schema.json",
  "name": "hnpulse",
  "compatibility_date": "2026-05-01",
  // No `main` — assets-only deployment.
  "assets": {
    "directory": "./web/dist",
    "not_found_handling": "404-page"
  },
  "routes": [
    { "pattern": "hnpulse.hena.dev", "custom_domain": true }
  ],
  "observability": { "enabled": true }
}
```

### 10.3 Environments
- **production**: deployed from `main` after each daily-data commit.
- **preview**: every PR gets a deploy via `wrangler versions upload` (preview URL auto-generated by Cloudflare); requires no Worker code since assets-only deployments support preview URLs natively.

### 10.4 Security Headers (no Worker, so via meta + zone)
Because there is no Worker handler, response-header customization is limited to:
- **Cloudflare zone settings**: HSTS (`Strict-Transport-Security`), Always Use HTTPS, automatic `X-Content-Type-Options: nosniff` from Cloudflare's defaults.
- **HTML `<meta>` tags** for `Content-Security-Policy` and `Referrer-Policy`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://static.cloudflareinsights.com">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  ```
- A `_headers` file is **not honoured** by Workers Static Assets (that is a Pages feature). If we ever need response-header customization, that becomes the trigger to revisit and add a thin Worker — out of scope for v1.

---

## 11. Authentication & Secrets

### 11.1 GCP Service Account
- Local development credential file: `/Users/chris/.config/gcloud/molu-486406-3e3f3f5157ff.json`.
- For CI: contents stored verbatim as GitHub repository secret **`GCP_SA_KEY`**.
- Pipeline reads via:
  ```ts
  const credentials = JSON.parse(process.env.GCP_SA_KEY!);
  const bq = new BigQuery({ credentials, projectId: "molu-486406" });
  ```

### 11.2 Cloudflare API Token
- Stored as GitHub repository secret **`CLOUDFLARE_API_TOKEN`** (scoped to: Workers Scripts: Edit, Workers Routes: Edit on the relevant zone).
- Used by `wrangler` in CI.

### 11.3 GitHub Token
- The default `GITHUB_TOKEN` provided by GHA is sufficient for committing back and managing the `data-snapshot` release.

### 11.4 Secret Rotation
- Service account key rotated annually; documented in `/about` and a `SECURITY.md` operational note.

---

## 12. Cost Controls (Defense in Depth)

| Layer                    | Mechanism |
| ------------------------ | --------- |
| GCP project billing      | Budget alarm at **$0.01** sends email immediately. |
| BigQuery per-query       | `maxBytesBilled: 50 * 1024**3` (50 GB) cap on every query. |
| BigQuery monthly         | Custom quota: `Query usage per day` set to **50 GB/day** in IAM & Admin → Quotas (1 successful run = ~17.75 GB; cap leaves room for at most ~2 retries/day before quota blocks further work). |
| GitHub Actions           | Public repo → unlimited free; no cap needed. |
| Cloudflare Workers       | Static-assets-only deployment; assets are unmetered. No Worker invocations occur. |
| Cloudflare Web Analytics | Free, unlimited. |

If any of the above triggers, the pipeline fails loudly via GHA email; the live dashboard continues serving last-known-good data.

---

## 13. Quality, Validation, and Operations

### 13.1 Pipeline Self-Tests
- Schema check of incoming BQ rows (column types match expected).
- Row count > 0.
- Date coverage check: every day in window has ≥ 1 story (HN never has zero days).
- Per-metric outlier check (10× rule, §8.6).

### 13.2 Frontend Smoke Tests (CI)
- Astro build succeeds.
- Lighthouse CI on the built output.
- Playwright check: page renders, range selector responds, no console errors.

### 13.3 Observability
- GHA built-in workflow-failure emails to repo owner.
- README badge: workflow status of `daily.yml`.
- Cloudflare Web Analytics for traffic visibility (no cookies, no banner needed).
- No third-party error monitoring (Sentry etc.) in v1 — out of scope to keep $0.

---

## 14. Engineering Conventions

These rules are **enforced by CI**, not just by social pressure. Every gate listed in §14.9 must pass before any merge.

### 14.1 TypeScript Compiler — TypeScript 7.0 Beta (`tsgo`)

- **Compiler**: [TypeScript 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) (the Go-based rewrite, ≈10× faster than 6.0). Installed as:
  ```bash
  bun add -d @typescript/native-preview@beta
  ```
- All TypeScript work runs through the **`tsgo`** binary (in place of `tsc`):
  ```bash
  bunx tsgo --noEmit                    # typecheck (CI gate)
  bunx tsgo --noEmit --watch            # local watch mode
  ```
- For tools that import from the literal `typescript` package (e.g. some editor integrations, Biome's optional type-aware mode), alias TypeScript 6 in `package.json`:
  ```jsonc
  { "devDependencies": { "typescript": "npm:@typescript/typescript6@^6.0.0" } }
  ```
- Pin `--checkers 2` in CI (CI runners are 2-vCPU); local machines may use defaults.

### 14.2 `tsconfig.json` Baseline (strict everywhere)

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,                          // TS 7 default; explicit anyway
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,    // TS 7 default
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": []                              // TS 7 default; opt in per-package
  }
}
```
Per-package `tsconfig.json` files extend a shared base at the repo root.

### 14.3 Type Discipline — Zero Escape Hatches

The following are **banned** and fail CI lint:
- `as any`, `as unknown`, `as never`
- `// @ts-ignore`, `// @ts-expect-error` *(except with a `TODO(#issue)` justification — ignored ones older than 30 days fail CI)*
- `// biome-ignore` *(same rule)*
- The non-null assertion operator `!` (`x!.foo`)
- The `any` type in any annotation
- Function overloads when a union or generic suffices

Boundary discipline:
- **Every** external input (BigQuery rows, file contents, env vars, fetch responses, CLI args) is parsed through a **`zod`** (or `valibot`) schema at the system boundary. Internal code receives only validated, narrowly-typed values.
- The shape of `kpis.json` and `meta.json` is defined as a single zod schema in `pipeline/src/schema/` and **re-used** by both the pipeline (output) and the web (input).

### 14.4 Code Organization

- **Co-location**: each unit lives in a folder containing its source, test, types, and (where relevant) styles. Pattern:
  ```
  components/kpi-card/
    kpi-card.tsx
    kpi-card.test.tsx
    kpi-card.types.ts          // optional, only if non-trivial
    index.ts                   // single named re-export
  ```
- **File size limit: ≤ 150 logical lines per file** (excluding blank lines, pure-comment lines, and import-only lines). Enforced by `scripts/check-file-size.ts` in CI.
- **Function size**: aim for ≤ 30 lines, single purpose. Functions over 50 lines fail Biome's `noExcessiveCognitiveComplexity` rule.
- **Single Responsibility**: one concept per file. If a file changes for two unrelated reasons, split it.
- **Pure first**: business logic is pure. Side effects (fetch, fs, BQ, GitHub) are wrapped behind tiny interface modules and injected, never called from logic-bearing code. This is what makes the 90 % coverage target achievable.
- **No grab-bag files**: `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts` are forbidden. Name files for what they actually do.

### 14.5 Naming

- Files & folders: `kebab-case` everywhere except React components, which use `PascalCase.tsx`.
- Exports: `camelCase` for values, `PascalCase` for types/components/classes, `SCREAMING_SNAKE_CASE` for compile-time constants.
- **Named exports only.** Default exports are allowed only in:
  - Astro pages (`src/pages/*.astro`) — required by Astro.
  - `index.ts` re-exports — never the original definition.
- Test files: `<unit>.test.ts(x)` co-located.

### 14.6 Linting & Formatting — Biome v2

- [**Biome v2**](https://biomejs.dev/blog/biome-v2/) (codename Biotype) is the **single tool** for both linting and formatting. ESLint and Prettier are not used.
- Config: `biome.jsonc` at the repo root; nested overrides per package only when essential.
- Recommended preset enabled with strict overrides for the rules listed in §14.3.
- Type-aware rules are enabled; Biome v2 does this without requiring the TypeScript compiler in the lint pass.
- **CI**: `bunx biome ci .` — runs lint **and** format check; any deviation fails the build.
- **Local pre-commit** (optional, via `simple-git-hooks`): `bunx biome check --write --staged`.

### 14.7 Dead Code Detection — Knip

- [**Knip**](https://knip.dev/) runs in CI to detect unused files, exports, types, dependencies, devDependencies, and binaries.
- Config: `knip.json` at the repo root, with separate workspace entries for `pipeline/` and `web/`.
- **CI**: `bunx knip --no-progress --reporter compact` — any finding fails the build.
- Findings must either be deleted, or explicitly added to the knip ignore list with a `// knip-ignore: <reason>` comment in the relevant file or a `knip.json` entry.

### 14.8 Testing — Vitest with ≥ 90 % Coverage

- **Vitest** (uses the same Vite that powers Astro — zero new toolchain).
- Tests are **co-located** (`foo.test.ts` next to `foo.ts`); never a separate `__tests__` folder.
- **Coverage threshold: ≥ 90 %** for lines, branches, statements, and functions — applied **per-file** (not just globally), so no single file can drag the rest down.
- Provider: `@vitest/coverage-v8`.
- `vitest.config.ts` snippet:
  ```ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      include: ["**/*.test.ts", "**/*.test.tsx"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        thresholds: { lines: 90, branches: 90, functions: 90, statements: 90, perFile: true },
        exclude: ["**/*.test.*", "**/*.config.*", "**/index.ts", "scripts/**", "**/*.astro"],
      },
    },
  });
  ```
- **Test categories**:
  - **Unit** — pure functions in `pipeline/src/**` and `web/src/lib/**`.
  - **Integration** — pipeline modules wired together with stubbed BQ / GitHub / DuckDB clients.
  - **Component** — React islands via `@testing-library/react` running in `vitest --browser.enabled` (Playwright provider).
- **CI**: `bunx vitest run --coverage`; both the run and the threshold check must pass.
- **Test names** describe behavior, not implementation: `it("returns +∞ when previous period is zero and current is positive", ...)`.

### 14.9 CI Quality Gate (`/.github/workflows/ci.yml`)

A single workflow on every PR and push to `main`. Jobs run in parallel; total wall-clock target ≤ 3 minutes.

| #  | Step              | Command                                              | Blocks merge |
| -- | ----------------- | ---------------------------------------------------- | ------------ |
| 1  | Type check        | `bunx tsgo --noEmit --checkers 2`                    | Yes          |
| 2  | Lint + format     | `bunx biome ci .`                                    | Yes          |
| 3  | Dead code         | `bunx knip --no-progress --reporter compact`         | Yes          |
| 4  | File size         | `bun run scripts/check-file-size.ts`                 | Yes          |
| 5  | Tests + coverage  | `bunx vitest run --coverage`                         | Yes          |
| 6  | Web build         | `bun run build` (in `/web`)                          | Yes          |
| 7  | Lighthouse CI     | (preserves the §9.4 budget)                          | Yes          |

A failure in **any** of these blocks the merge. The pipeline workflow (`daily.yml`) does not run these gates inline (they have already passed on `main`); it only runs the data-producing steps.

---

## 15. Repository Structure

```
hnpulse/
├── .github/
│   └── workflows/
│       ├── daily.yml          # cron 14:00 UTC: pipeline + commit + deploy
│       ├── pr-preview.yml     # PR open: build + wrangler preview deploy
│       └── ci.yml             # PR/main: §14.9 quality gate (parallel jobs)
├── scripts/
│   └── check-file-size.ts     # enforces §14.4 ≤150 logical lines per file
├── pipeline/                  # Bun + TypeScript (see §14 conventions)
│   ├── src/
│   │   ├── bq/                # BigQuery client + query builders (co-located)
│   │   │   ├── client.ts
│   │   │   ├── client.test.ts
│   │   │   └── index.ts
│   │   ├── release/           # GitHub Release asset add/delete
│   │   ├── duckdb/            # DuckDB CLI invocation + SQL templates
│   │   ├── aggregate/         # aggregate.sql + result parser
│   │   ├── validate/          # 10× rule and other gates
│   │   ├── emit/              # writes kpis.<sha>.json + meta.json
│   │   ├── domains/           # tldts wrapper
│   │   ├── schema/            # zod schemas shared with /web (§14.3)
│   │   └── index.ts           # entry — orchestrates the daily run
│   ├── vitest.config.ts
│   ├── package.json
│   └── tsconfig.json
├── web/                       # Astro project (created via shadcn preset)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro    # the dashboard
│   │   │   └── about.astro    # methodology
│   │   ├── components/        # React islands, co-located with tests + types
│   │   │   ├── kpi-card/
│   │   │   ├── range-selector/
│   │   │   └── ...
│   │   ├── styles/            # tailwind + theme tokens
│   │   └── lib/               # data loaders, range filters, formatters (each co-located)
│   ├── public/
│   │   ├── data/              # generated by pipeline; committed
│   │   │   ├── kpis.<sha>.json
│   │   │   └── meta.json
│   │   ├── og.png             # 1200×630 social card
│   │   └── favicon.png        # 512×512 brand mark (HN orange motif)
│   ├── astro.config.mjs
│   ├── components.json        # shadcn config (Base preset)
│   ├── tailwind.config.* / tailwind.css
│   ├── vitest.config.ts
│   └── package.json
├── docs/
│   ├── en/
│   │   └── spec.md            # this document
│   └── ko/
│       └── spec.md            # Korean translation (kept in sync)
├── wrangler.jsonc
├── biome.jsonc                # §14.6 lint + format config
├── knip.json                  # §14.7 dead code config
├── tsconfig.base.json         # shared strict TS 7 config (§14.2)
├── bunfig.toml
├── package.json               # workspace root
├── README.md                  # description, badges, quickstart
├── LICENSE                    # MIT
└── SECURITY.md
```

---

## 16. JSON Schemas

### 16.1 `meta.json`
```jsonc
{
  "schemaVersion": 1,
  "lastUpdated": "2026-05-04T14:03:14Z",   // pipeline finish time (UTC)
  "dataAsOf": "2026-05-03",                 // most recent UTC day in window
  "windowStart": "2024-05-04",
  "windowEnd": "2026-05-03",
  "kpisFile": "/data/kpis.f4a9c1e.json",    // hashed asset path
  "buildSha": "f4a9c1e...",                 // git SHA of the producing commit
  "pipelineVersion": "1.0.0"
}
```

### 16.2 `kpis.<sha>.json`
```jsonc
{
  "schemaVersion": 1,
  "windowStart": "2024-05-04",
  "windowEnd": "2026-05-03",
  "days": ["2024-05-04", "2024-05-05", "...", "2026-05-03"],   // 730 strings
  "metrics": {
    "stories":            [123, 130, 119, ...],
    "comments":           [987, 1004, 950, ...],
    "activeCommenters":   [410, 433, 401, ...],
    "activeSubmitters":   [105, 112, 99, ...],
    "medianScore":        [11, 12, 10, ...],
    "p90Score":           [78, 82, 75, ...],
    "commentsPerStory":   [8.0, 7.7, 8.0, ...],
    "successRateGte100":  [0.043, 0.051, 0.047, ...],
    "showHn":             [12, 15, 11, ...],
    "askHn":              [9, 8, 11, ...],
    "jobs":               [3, 4, 3, ...],
    "deadFlaggedRatio":   [0.012, 0.015, 0.013, ...]
  },
  "topDomainsByDay": [
    {
      "date": "2026-05-03",
      "domains": [
        { "name": "github.com",       "stories": 41, "share": 0.0532 },
        { "name": "nytimes.com",      "stories": 23, "share": 0.0298 },
        ...
      ]                                                          // length = 10
    }
    // one entry per day in window
  ]
}
```

Frontend computes range-aggregated values (sum / mean / p-quantile) on the fly from these arrays.

### 16.3 Schema Versioning
- `schemaVersion` is asserted on load; mismatch shows a "please refresh" banner instructing the user to hard-refresh.
- Schema bumps are coordinated commits that change pipeline + frontend together; never silent.

---

## 17. Daily Workflow (`.github/workflows/daily.yml`)

```yaml
name: daily
on:
  schedule:
    - cron: "0 14 * * *"       # 14:00 UTC daily (~1 h after BQ public dataset refresh)
  workflow_dispatch: {}        # manual trigger / first bootstrap
permissions:
  contents: write              # commit + release manage
jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 60        # bootstrap may need extra headroom
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: opt-nc/setup-duckdb-action@v1
      - name: Install deps
        run: bun install
        working-directory: pipeline
      - name: Run pipeline (freshness-checked, no-op if BQ not yet refreshed)
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bun run start
        working-directory: pipeline
      - name: Commit data
        run: |
          git config user.name "hnpulse-bot"
          git config user.email "bot@hena.dev"
          git add web/public/data
          git diff --cached --quiet || git commit -m "chore(data): $(date -u +%Y-%m-%d) [skip ci]"
          git push
      - name: Build web
        run: bun install && bun run build
        working-directory: web
      - name: Deploy static assets to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

`pr-preview.yml` and `ci.yml` follow the same shape but skip the BQ query and instead use the committed JSON.

---

## 18. SEO & Social

### 18.1 `<head>` Essentials
```html
<title>HN Pulse — Hacker News, daily vitals</title>
<meta name="description" content="A daily-updated dashboard of Hacker News' most important community vitals: submissions, comments, active users, top domains, and more.">
<meta property="og:title" content="HN Pulse">
<meta property="og:description" content="Hacker News, daily vitals.">
<meta property="og:image" content="https://hnpulse.hena.dev/og.png">
<meta property="og:url" content="https://hnpulse.hena.dev">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://hnpulse.hena.dev">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="alternate" type="application/json" href="/data/meta.json" title="HN Pulse data feed">
```

### 18.2 `robots.txt` & `sitemap.xml`
- Both served from `/`.
- `robots.txt` allows everything.
- `sitemap.xml` lists `/` and `/about`.

### 18.3 Web Analytics
- **Cloudflare Web Analytics** beacon snippet (single line) injected into `<head>`.
- No cookies; no GDPR banner needed.
- Site tag obtained from Cloudflare dashboard once the custom domain is attached.

---

## 19. About Page Content (outline)

1. **What this is** — one paragraph.
2. **Where the data comes from** — link to `bigquery-public-data.hacker_news.full`.
3. **How fresh it is** — daily at 14:00 UTC, ~1 h after the BQ public dataset's own daily refresh (~13:00 UTC). Pipeline performs a freshness check and exits cleanly if the source isn't ready, retrying next cron.
4. **What each KPI means** — table mirroring §5.
5. **What is excluded** — `deleted` / `dead` items.
6. **Domain extraction** — eTLD+1, examples.
7. **Period comparison** — formula explained.
8. **Time bucketing** — table from §4.4.
9. **Open data** — direct link to the latest `kpis.json`, `meta.json`, and the `data-snapshot` GitHub Release (full Parquet rows including `text` for power users).
10. **Source code & license** — link to repo, MIT.
11. **Privacy** — Cloudflare Web Analytics, no cookies, no PII.
12. **Contact** — `hi@hena.dev`.

---

## 20. Open Questions / Future Work (post-v1)

- Embeddable KPI cards (single iframe per metric).
- RSS feed of "yesterday's HN in numbers".
- Historical comparison ("today vs. same day last year").
- Korean (`/ko`) localization using Astro i18n.
- Optional Firebase API supplement for sub-daily updates (would require revisiting cost model).
- Topic / keyword analysis using the persisted `text` column (no extra BQ scan needed — Parquet snapshot already contains it).
- Full-text search over comments using DuckDB's `fts` extension on the same Parquet snapshot.

---

## 21. References

- Hacker News BigQuery dataset: https://console.cloud.google.com/marketplace/product/y-combinator/hacker-news
- Hacker News Firebase API: https://github.com/HackerNews/API
- BigQuery pricing & free tier: https://cloud.google.com/bigquery/pricing
- shadcn (Base variant): https://ui.shadcn.com/docs/components/base
- shadcn Chart: https://ui.shadcn.com/docs/components/base/chart
- DuckDB: https://duckdb.org/
- Astro: https://docs.astro.build/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Web Analytics: https://developers.cloudflare.com/web-analytics/
- tldts (eTLD+1 extraction): https://github.com/remusao/tldts
- Public Suffix List: https://publicsuffix.org/
- TypeScript 7.0 Beta announcement: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/
- typescript-go (tsgo) repo: https://github.com/microsoft/typescript-go
- Biome v2 (Biotype): https://biomejs.dev/blog/biome-v2/
- Knip (dead code): https://knip.dev/
- Vitest: https://vitest.dev/
- zod (boundary validation): https://zod.dev/

---

*End of specification — v1.0, drafted 2026-05-04.*
