# Security policy

## Reporting

Please email security issues privately to **hi@hena.dev**. Do not open public GitHub issues for vulnerabilities.

## Secret rotation

| Secret                  | Where stored                              | Rotation cadence | Last rotated |
| ----------------------- | ----------------------------------------- | ---------------- | ------------ |
| `GCP_SA_KEY`            | GitHub repository secret                  | Annually         | —            |
| `CLOUDFLARE_API_TOKEN`  | GitHub repository secret                  | Annually         | —            |

The default `GITHUB_TOKEN` provided to GitHub Actions is sufficient for committing data updates and managing the `data-snapshot` release; no separate token is needed.

## Cost controls

This project is designed to operate at $0 forever. Defense in depth:

1. GCP billing budget alarm at $0.01.
2. BigQuery `maxBytesBilled` cap at 50 GB per query.
3. BigQuery custom quota of 50 GB/day.
4. Public-repo GitHub Actions (unlimited free minutes).
5. Cloudflare Workers Static Assets only (unmetered).

If any cap fires, the daily pipeline fails loudly via GHA email; the live dashboard continues serving the last known-good data.
