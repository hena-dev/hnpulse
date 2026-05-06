import { createHash } from "node:crypto";

export const contentHash = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex").slice(0, 7);

export const kpisFilenameFor = (jsonString: string): string =>
  `/data/kpis.${contentHash(jsonString)}.json`;
