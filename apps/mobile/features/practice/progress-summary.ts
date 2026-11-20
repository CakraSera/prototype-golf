import type { Completion } from '@golf/shared';

export type ProgressSummary = {
  drillsCompleted: number;
  daysPracticed: number;
  days: { key: string; date: Date; count: number }[];
  invalidTimestampCount: number;
};

function localDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildProgressSummary(
  completions: readonly Completion[],
  now: Date,
): ProgressSummary {
  const days: ProgressSummary['days'] = [];
  const daysByKey = new Map<string, ProgressSummary['days'][number]>();
  for (let offset = -6; offset <= 0; offset += 1) {
    // Calendar arithmetic, not elapsed milliseconds: DST days need not be 24 hours.
    const date = new Date(now.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const day = { key: localDateKey(date), date, count: 0 };
    days.push(day);
    daysByKey.set(day.key, day);
  }

  const seenIds = new Set<string>();
  let drillsCompleted = 0;
  let daysPracticed = 0;
  let invalidTimestampCount = 0;
  for (const completion of completions) {
    if (seenIds.has(completion.id)) continue;
    seenIds.add(completion.id);
    const completedAt = new Date(completion.completedAt);
    if (Number.isNaN(completedAt.getTime())) {
      invalidTimestampCount += 1;
      continue;
    }
    const day = daysByKey.get(localDateKey(completedAt));
    if (!day) continue;
    if (day.count === 0) daysPracticed += 1;
    day.count += 1;
    drillsCompleted += 1;
  }

  return { drillsCompleted, daysPracticed, days, invalidTimestampCount };
}
