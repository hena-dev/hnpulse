import type { IndexWindow } from "./range.ts";

const isUsable = (n: number): boolean => Number.isFinite(n);

export const mean = (xs: readonly number[]): number => {
  let sum = 0;
  let n = 0;
  for (const x of xs) {
    if (!isUsable(x)) continue;
    sum += x;
    n += 1;
  }
  return n === 0 ? 0 : sum / n;
};

export const sumOver = (xs: readonly number[], w: IndexWindow): number => {
  let sum = 0;
  for (let i = w.start; i < w.end; i += 1) {
    const v = xs[i];
    if (v !== undefined && isUsable(v)) sum += v;
  }
  return sum;
};

export const weightedMean = (values: readonly number[], weights: readonly number[]): number => {
  if (values.length !== weights.length) {
    throw new Error(`length mismatch: ${values.length} vs ${weights.length}`);
  }
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    const w = weights[i];
    if (v === undefined || w === undefined) continue;
    if (!isUsable(v) || !isUsable(w)) continue;
    num += v * w;
    den += w;
  }
  return den === 0 ? 0 : num / den;
};
