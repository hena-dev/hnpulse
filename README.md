# HN Pulse

> A single-page public analytics dashboard showing the long-term vitals of Hacker News, updated daily, hosted at **hnpulse.hena.dev**, designed to operate at **$0 forever**.

[![daily](https://github.com/hena-dev/hnpulse/actions/workflows/daily.yml/badge.svg)](https://github.com/hena-dev/hnpulse/actions/workflows/daily.yml)
[![ci](https://github.com/hena-dev/hnpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/hena-dev/hnpulse/actions/workflows/ci.yml)

## What this is

HN Pulse is an executive-style KPI dashboard for the Hacker News community: submission volume, engagement, audience size, content quality, and source diversity. The dashboard supports configurable time ranges (1w / 1m / 3m / 6m / 1y / 2y) with period-over-period deltas and trend sparklines, plus a small set of detailed charts.

Data comes from the public BigQuery dataset `bigquery-public-data.hacker_news.full`. The pipeline runs daily at 14:00 UTC (~1 h after the BQ public dataset's own refresh), persists per-day Parquet snapshots to a single rolling GitHub Release, recomputes daily metrics with DuckDB, and commits a hashed `kpis.<sha>.json` to the repo.

## Quickstart

```bash
bun install
bun run typecheck   # TypeScript 7 (tsgo)
bun run lint        # Biome v2
bun run knip        # dead-code
bun run filesize    # ≤150 logical lines per file
bun run test        # vitest (≥90% per-file coverage)
bun run build       # Astro
```

## Repo layout

```
hnpulse/
├── pipeline/            # Bun + TypeScript daily ETL
├── web/                 # Astro + React + shadcn-style islands
├── scripts/             # repo-level utilities (check-file-size.ts, gen-placeholder-data.ts)
├── docs/en/spec.md      # the source-of-truth product+technical spec
└── .github/workflows/   # ci.yml, daily.yml, pr-preview.yml
```

See `docs/en/spec.md` for the full specification.

## License

MIT
