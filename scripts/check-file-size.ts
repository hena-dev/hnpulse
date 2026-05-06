#!/usr/bin/env bun
/**
 * Enforces the §14.4 rule: <= 150 logical lines per file.
 *
 * Logical lines exclude:
 *  - blank lines
 *  - pure-comment lines
 *  - import-only lines
 *
 * Exits with code 1 if any TS/TSX/Astro file exceeds the limit.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LIMIT = 150;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const INCLUDE_EXTS = new Set([".ts", ".tsx", ".astro"]);
const EXCLUDE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".astro",
  ".wrangler",
  "coverage",
  "tmp",
  ".tmp",
  ".git",
  "data",
  "ui",
]);

const isSkippedDir = (name: string): boolean => {
  if (name.startsWith(".") && name !== ".github") return true;
  return EXCLUDE_DIRS.has(name);
};

const matchesExt = (name: string): boolean => {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  return INCLUDE_EXTS.has(ext);
};

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (isSkippedDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && matchesExt(entry.name)) yield full;
  }
}

interface LineState {
  inBlock: boolean;
  counted: boolean;
}

const isImportOrReExport = (line: string): boolean => {
  if (line.startsWith("import ") || line.startsWith("import{") || line.startsWith('import"')) {
    return true;
  }
  if (line.startsWith("export {") || line.startsWith("export type {")) return true;
  return false;
};

const classifyLine = (raw: string, inBlock: boolean): LineState => {
  const line = raw.trim();
  if (line.length === 0) return { inBlock, counted: false };
  if (inBlock) return { inBlock: !line.includes("*/"), counted: false };
  if (line.startsWith("/*")) return { inBlock: !line.includes("*/"), counted: false };
  if (line.startsWith("//")) return { inBlock: false, counted: false };
  if (isImportOrReExport(line)) return { inBlock: false, counted: false };
  return { inBlock: false, counted: true };
};

export function countLogicalLines(source: string): number {
  let count = 0;
  let inBlock = false;
  for (const raw of source.split(/\r?\n/)) {
    const state = classifyLine(raw, inBlock);
    inBlock = state.inBlock;
    if (state.counted) count += 1;
  }
  return count;
}

async function main(): Promise<number> {
  const offenders: { file: string; lines: number }[] = [];
  for await (const file of walk(ROOT)) {
    const info = await stat(file);
    if (!info.isFile()) continue;
    const src = await readFile(file, "utf8");
    const n = countLogicalLines(src);
    if (n > LIMIT) offenders.push({ file: relative(ROOT, file), lines: n });
  }
  if (offenders.length > 0) {
    console.error(`File-size violations (limit ${LIMIT}):`);
    for (const o of offenders) console.error(`  ${o.file} - ${o.lines} logical lines`);
    return 1;
  }
  console.info(`OK: all files within ${LIMIT} logical lines`);
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const code = await main();
  process.exit(code);
}
