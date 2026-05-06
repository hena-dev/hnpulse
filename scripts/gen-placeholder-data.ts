#!/usr/bin/env bun
import { writeFileSync } from "node:fs";

const days: string[] = [];
const start = new Date("2024-05-04T00:00:00Z");
for (let i = 0; i < 730; i += 1) {
  const d = new Date(start.getTime() + i * 86_400_000);
  days.push(d.toISOString().slice(0, 10));
}
const seq = (base: number, amp: number) =>
  days.map((_, i) => Math.round(base + amp * Math.sin(i / 30)));
const seqf = (base: number, amp: number) =>
  days.map((_, i) => +(base + amp * Math.sin(i / 30)).toFixed(3));

const kpis = {
  schemaVersion: 1,
  windowStart: days[0],
  windowEnd: days[days.length - 1],
  days,
  metrics: {
    stories: seq(800, 100),
    comments: seq(7000, 800),
    activeCommenters: seq(3500, 300),
    activeSubmitters: seq(700, 80),
    medianScore: seq(11, 2),
    p90Score: seq(80, 10),
    commentsPerStory: seqf(8.5, 1),
    successRateGte100: seqf(0.045, 0.01),
    showHn: seq(20, 5),
    askHn: seq(15, 4),
    jobs: seq(3, 1),
    deadFlaggedRatio: seqf(0.012, 0.003),
  },
  topDomainsByDay: days.map((d) => ({
    date: d,
    domains: [
      { name: "github.com", stories: 40, share: 0.05 },
      { name: "nytimes.com", stories: 22, share: 0.027 },
      { name: "medium.com", stories: 18, share: 0.022 },
      { name: "substack.com", stories: 14, share: 0.017 },
      { name: "arxiv.org", stories: 12, share: 0.015 },
    ],
  })),
};

writeFileSync("web/public/data/kpis.0000000.json", JSON.stringify(kpis));
writeFileSync("web/public/data/kpis-current.json", JSON.stringify(kpis));
console.info(`placeholder kpis written: ${days.length} days`);
