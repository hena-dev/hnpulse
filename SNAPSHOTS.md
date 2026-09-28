# Reference-date snapshots

A dashboard link such as `/1m?date=2025-06-01` pins its reference date. Each
snapshot contains a 730-day window ending on that UTC date. The existing range
buttons select a view within that window. Links without `date` follow the latest
published analysis.

## Publication lifecycle

- Selectable reference dates start at **2025-01-01**, permanently.
- The newest seven reference dates are **provisional**. Their values can change
  on subsequent successful pipeline runs.
- Older snapshots are **final**. The pipeline writes them once; later runs reuse
  their bytes. Finalization requires a successful source refresh and validation,
  rather than just passage of time.
- Final snapshot data remains fixed across UI releases. Presentation and
  translations can still improve.
- Historical backfills describe items created in each window using the source
  available at backfill time. They do not reconstruct scores or moderation flags
  exactly as they appeared on the original reference date.

The data files are locale-independent:

| File | Purpose |
| --- | --- |
| `web/public/data/meta.json` | Latest feed metadata and available snapshot bounds |
| `web/public/data/snapshots/YYYY-MM-DD.json` | Permanent final snapshot |
| `web/public/data/provisional/YYYY-MM-DD.json` | Revalidatable provisional snapshot |
| `web/public/data/kpis-current.json` | Existing latest-data feed |

Snapshots contain the metric series and exact top-domain rankings for each
supported range. Daily top-ten lists cannot produce exact rankings across a
longer interval, so the pipeline computes these from full domain counts.

## Initial rollout and verification

1. Run the `daily` workflow manually with **dry_run = true**. This downloads and
   analyzes real source data, but does not upload raw files, commit, or deploy.
2. Inspect the `snapshot-dry-run` workflow artifact. Check the earliest date,
   newest provisional date, and finalization boundary.
3. Run `daily` normally to publish the archive and activate the picker.
4. Subsequent runs finish any raw-data backfill left by the upload cap.

The picker is activated by `meta.snapshots`. Before the backfill is published,
the date control is visible but disabled, with a message explaining that
historical snapshots are being prepared.

For local execution, the pipeline uses its existing BigQuery and GitHub
credentials. `PIPELINE_DRY_RUN=true` writes its output to
`pipeline/tmp/dry-run-data`. `PIPELINE_UPLOAD_CAP` controls the per-run upload cap
(default 400). `PIPELINE_NOW` supplies the analysis clock; publishing backwards
over an existing snapshot manifest is rejected.

```sh
bun run snapshots:check
bun run snapshots:check HEAD pipeline/tmp/dry-run-data
bun run ci
```

The snapshot guard checks every advertised file and compares existing final
files with Git. CI compares against the PR base or previous main commit. The
daily workflow compares against its checkout before committing generated data.

## Permanent raw archive

Raw daily Parquet inputs from **2023-01-01 onward** are retained. New assets go
to yearly GitHub releases (`data-2023`, `data-2024`, and so on), avoiding GitHub's
1,000-assets-per-release limit. Existing assets in `data-snapshot` remain readable
in place. Recent replacements are written to the appropriate yearly release.

Writes are paced and capped so a backfill can resume over multiple workflow
runs. Locally extracted inputs still participate in snapshot generation when
the raw-upload cap is reached. Snapshot availability does not depend on every
raw file having been uploaded already.

## Static hosting

The site remains an assets-only Cloudflare deployment. Dated URLs load snapshot
data in the browser; the latest dashboard is prerendered. The page suppresses
latest numbers while resolving a dated URL, and reports snapshot load errors
instead of presenting data for a different date. Final snapshot responses have
long-lived caching; provisional responses revalidate.
