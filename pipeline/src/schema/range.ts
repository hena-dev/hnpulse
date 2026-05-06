import { z } from "zod";

export const RANGE_IDS = ["1w", "1m", "3m", "6m", "1y", "2y"] as const;

export type RangeId = (typeof RANGE_IDS)[number];

export const RangeIdSchema = z.enum(RANGE_IDS);

export const RANGE_DAYS: Readonly<Record<RangeId, number>> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "2y": 730,
};

export const isRangeId = (value: unknown): value is RangeId => {
  if (typeof value !== "string") return false;
  return (RANGE_IDS as readonly string[]).includes(value);
};
