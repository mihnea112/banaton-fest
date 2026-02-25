export type DayCode = "FRI" | "SAT" | "SUN" | "MON";

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function groupIntoRows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function toInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
