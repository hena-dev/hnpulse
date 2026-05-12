import type { BqRow, ItemType } from "../schema/bq-row.ts";

const ITEM_TYPES = new Set<ItemType>(["story", "comment", "job", "poll", "pollopt"]);

const finiteInt = (v: unknown): v is number => Number.isInteger(v) && Number.isFinite(v);
const stringOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const numberOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const booleanOrFalse = (v: unknown): boolean => v === true;

export const hnItemToBqRow = (item: unknown): BqRow | null => {
  if (item === null || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  if (!finiteInt(raw.id) || !finiteInt(raw.time)) return null;
  if (typeof raw.type !== "string" || !ITEM_TYPES.has(raw.type as ItemType)) return null;

  return {
    id: raw.id,
    type: raw.type as ItemType,
    by: stringOrNull(raw.by),
    title: stringOrNull(raw.title),
    url: stringOrNull(raw.url),
    text: stringOrNull(raw.text),
    score: numberOrNull(raw.score),
    time: raw.time,
    timestamp: new Date(raw.time * 1000).toISOString(),
    parent: numberOrNull(raw.parent),
    descendants: numberOrNull(raw.descendants),
    ranking: null,
    dead: booleanOrFalse(raw.dead),
    deleted: booleanOrFalse(raw.deleted),
  };
};
