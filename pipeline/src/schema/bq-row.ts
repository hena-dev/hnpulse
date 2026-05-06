import { z } from "zod";

export const ITEM_TYPES = ["story", "comment", "job", "poll", "pollopt"] as const;
export const ItemTypeSchema = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof ItemTypeSchema>;

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const BqRowSchema = z.object({
  id: z.number().int().nonnegative(),
  type: ItemTypeSchema,
  by: nullableString,
  title: nullableString,
  url: nullableString,
  text: nullableString,
  score: nullableNumber,
  time: z.number().int().nonnegative(),
  timestamp: z.string(),
  parent: nullableNumber,
  descendants: nullableNumber,
  ranking: nullableNumber,
  dead: z.boolean().nullable().default(false),
  deleted: z.boolean().nullable().default(false),
});

export type BqRow = z.infer<typeof BqRowSchema>;
