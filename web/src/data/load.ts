import { parseKpis, parseMeta } from "./schema.ts";
import type { KpisJson, MetaJson } from "./types.ts";

export type FetchLike = (input: string) => Promise<Response>;

const fetchJson = async (url: string, fetchFn: FetchLike): Promise<unknown> => {
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(`fetch ${url}: HTTP ${r.status}`);
  return r.json();
};

export interface DashboardData {
  meta: MetaJson;
  kpis: KpisJson;
}

export const joinUrl = (base: string, path: string): string => {
  if (path.startsWith("http")) return path;
  return new URL(path.replace(/^\//, ""), base).toString();
};

export const loadDashboardData = async (
  base: string,
  fetchFn: FetchLike,
): Promise<DashboardData> => {
  const meta = parseMeta(await fetchJson(joinUrl(base, "/data/meta.json"), fetchFn));
  const kpis = parseKpis(await fetchJson(joinUrl(base, meta.kpisFile), fetchFn));
  return { meta, kpis };
};
