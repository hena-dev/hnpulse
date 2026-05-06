#!/usr/bin/env bun
/**
 * Generates web/public/og.png (1200x630) from an SVG, using sharp via Bun.
 * Run once at design time: `bun run scripts/gen-og-image.ts`
 */
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = join(ROOT, "web", "public", "og.png");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a" />
      <stop offset="100%" stop-color="#1f1f1f" />
    </linearGradient>
    <linearGradient id="orange" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff7a18" />
      <stop offset="100%" stop-color="#ff5500" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <g transform="translate(80,180)">
    <circle cx="56" cy="56" r="56" fill="url(#orange)" />
    <text x="56" y="78" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif"
          font-size="56" font-weight="800" fill="white" text-anchor="middle">Y</text>
  </g>
  <text x="240" y="270" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif"
        font-size="120" font-weight="800" fill="#fafafa">HN Pulse</text>
  <text x="240" y="340" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif"
        font-size="40" fill="#a3a3a3">Hacker News, daily vitals</text>
  <g transform="translate(80, 480)" stroke="#525252" stroke-width="3" fill="none">
    <polyline points="0,80 60,72 120,90 180,55 240,68 300,40 360,52 420,30 480,46 540,18 600,28
      660,12 720,24 780,8 840,18 900,2 960,12 1020,0" />
  </g>
  <text x="80" y="600" font-family="-apple-system, BlinkMacSystemFont, monospace"
        font-size="20" fill="#737373">hnpulse.hena.dev</text>
</svg>`;

const sharp = await import("sharp");
const png = await sharp.default(Buffer.from(svg)).png().toBuffer();
await writeFile(OUT, png);
console.info(`og.png written: ${OUT} (${png.length} bytes)`);
