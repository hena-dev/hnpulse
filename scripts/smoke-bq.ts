#!/usr/bin/env bun
import { fetchMaxTimestamp, isFreshAsOf } from "../pipeline/src/bq/freshness.ts";
/**
 * Smoke-tests the GCP credentials by issuing the freshness-check query
 * against `bigquery-public-data.hacker_news.full`.  Costs ~17.75 GB of
 * the 1 TB monthly BigQuery free tier.
 *
 * Run:
 *   GCP_SA_KEY="$(cat ~/.config/gcloud/molu-486406-3e3f3f5157ff.json)" \
 *     bun run scripts/smoke-bq.ts
 */
import { createRealBqClient } from "../pipeline/src/bq/real-client.ts";

const MAX_BYTES = 50 * 2 ** 30; // §8.3 cap — 50 GB

const bq = createRealBqClient();
const start = Date.now();
const maxTs = await fetchMaxTimestamp(bq, { maxBytesBilled: MAX_BYTES });
const ms = Date.now() - start;

const now = new Date();
const fresh = isFreshAsOf(maxTs, now);

console.info(`✓ BQ MAX(timestamp) = ${maxTs.toISOString()}`);
console.info(`  query took ${ms} ms`);
console.info(`  now              = ${now.toISOString()}`);
console.info(`  fresh per §8.2   = ${fresh ? "YES" : "NO (would skip pipeline run)"}`);
