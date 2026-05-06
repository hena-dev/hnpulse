const MS_PER_DAY = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const startOfUtcDay = (d: Date): Date => {
  const out = new Date(d.getTime());
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

export const formatUtcDay = (d: Date): string => {
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseUtcDay = (s: string): Date => {
  const m = DATE_RE.exec(s);
  if (m === null) throw new Error(`invalid YYYY-MM-DD: ${s}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`invalid calendar date: ${s}`);
  }
  return d;
};

export const daysAgoUtc = (n: number): Date => {
  const today = startOfUtcDay(new Date());
  return new Date(today.getTime() - n * MS_PER_DAY);
};

export const enumerateUtcDays = (start: Date, end: Date): string[] => {
  if (end.getTime() < start.getTime()) throw new Error("end < start");
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    out.push(formatUtcDay(new Date(t)));
  }
  return out;
};
