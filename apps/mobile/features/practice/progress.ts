import type { Completion } from '@golf/shared';

const ranks = ['Rookie', 'Scout', 'Pathfinder', 'Range Ranger'] as const;

export type Badge = {
  id: 'first-swing' | 'flight-reader' | 'self-starter' | 'steady-nerves';
  name: string;
  requirement: string;
  count: number;
  target: number;
  unit: string;
  earnedBy: Completion | null;
};

type Reading = { score: number; completion: Completion };
type Independence = { unaided: boolean; completion: Completion };

export type PracticeProgress = {
  level: number;
  rank: typeof ranks[number];
  badges: Badge[];
  nextBadge: Badge | null;
  reading: { baseline: Reading | null; latest: Reading | null; days: ReadonlySet<string> };
  independence: { days: number; latest: Independence | null; previous: Independence | null };
  confidence: { latest: Reading | null; pair: { before: number; after: number; completion: Completion } | null };
};

// The recorded offset keeps day-based credit stable when the player travels.
export function practiceLocalDay(utcTime: number, utcOffsetMinutes: number) {
  return new Date(utcTime + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

// Use the server's newest-first order: its timestamps have more precision than the serialized dates.
export function progressFromCompletions(completions: readonly Completion[]): PracticeProgress {
  const readingDays = new Set<string>();
  const independenceDays = new Set<string>();
  const confidentDays = new Set<string>();
  let baselineReading: Reading | null = null;
  let latestReading: Reading | null = null;
  let lastIndependence: Independence | null = null;
  let previousIndependence: Independence | null = null;
  let confidence: Reading | null = null;
  let pair: PracticeProgress['confidence']['pair'] = null;
  let flightReader: Completion | null = null;
  let selfStarter: Completion | null = null;
  let steadyNerves: Completion | null = null;
  let bestScore = 0;

  for (let index = completions.length - 1; index >= 0; index--) {
    const completion = completions[index]!;
    const check = completion.checkIn;
    if (!check) continue;
    const day = practiceLocalDay(Date.parse(completion.completedAt), check.utcOffsetMinutes);
    if (check.shotReads?.length === 5 && !readingDays.has(day)) {
      readingDays.add(day);
      let score = 0;
      for (const read of check.shotReads) if (read === 'correct') score++;
      latestReading = { score, completion };
      baselineReading ??= latestReading;
      bestScore = Math.max(bestScore, score);
      if (score >= 4) flightReader ??= completion;
    }
    if (check.actedIndependently !== undefined) {
      previousIndependence = lastIndependence;
      lastIndependence = { unaided: check.actedIndependently, completion };
      if (check.actedIndependently) independenceDays.add(day);
      if (independenceDays.size >= 2) selfStarter ??= completion;
    }
    if (check.confidenceAfter !== undefined) {
      confidence = { score: check.confidenceAfter, completion };
      if (check.confidenceBefore !== undefined) {
        pair = { before: check.confidenceBefore, after: check.confidenceAfter, completion };
      }
      if (check.confidenceAfter >= 4) confidentDays.add(day);
      if (confidentDays.size >= 2) steadyNerves ??= completion;
    }
  }

  const badges: Badge[] = [
    { id: 'first-swing', name: 'First Swing', requirement: 'Save your first completed drill.',
      count: completions.length > 0 ? 1 : 0, target: 1, unit: 'drill', earnedBy: completions.at(-1) ?? null },
    { id: 'flight-reader', name: 'Flight Reader', requirement: 'Call both the start and curve on 4 of 5 shots in one partner check. Only the first completed check each day counts.',
      count: Math.min(bestScore, 4), target: 4, unit: 'correct', earnedBy: flightReader },
    { id: 'self-starter', name: 'Self-Starter', requirement: 'Have a partner confirm you explained and tried one move unaided on two different days.',
      count: Math.min(independenceDays.size, 2), target: 2, unit: 'days', earnedBy: selfStarter },
    { id: 'steady-nerves', name: 'Steady Nerves', requirement: 'Rate your confidence at least 4/5 after practice on two different days.',
      count: Math.min(confidentDays.size, 2), target: 2, unit: 'days', earnedBy: steadyNerves },
  ];
  const skillBadges = Number(!!flightReader) + Number(!!selfStarter) + Number(!!steadyNerves);
  let nextBadge: Badge | null = null;
  for (const badge of badges) {
    if (!badge.earnedBy && (!nextBadge || badge.count / badge.target > nextBadge.count / nextBadge.target)) {
      nextBadge = badge;
    }
  }
  return {
    level: skillBadges + 1,
    rank: ranks[skillBadges]!,
    badges,
    nextBadge,
    reading: { baseline: baselineReading, latest: latestReading, days: readingDays },
    independence: { days: independenceDays.size, latest: lastIndependence, previous: previousIndependence },
    confidence: { latest: confidence, pair },
  };
}
