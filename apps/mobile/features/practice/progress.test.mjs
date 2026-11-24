import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progressFromCompletions } from './progress.ts';

const match = {
  ruleId: 'r01', shot: { start: 'right', curve: 'straight', height: 'normal' },
  feedback: 'Starts right', drill: { id: 'd01', title: 'Start-line check', instruction: 'Call the start.' },
};
const completion = (id, completedAt, evidence) => ({
  id, completedAt, match, ruleId: match.ruleId,
  ...(evidence && { checkIn: { utcOffsetMinutes: 120, ...evidence } }),
});
const earned = progress => progress.badges.filter(badge => badge.earnedBy).map(badge => badge.name);
const fourCorrect = ['correct', 'different', 'correct', 'correct', 'correct'];

test('a legacy completion unlocks First Swing once, without rating any skill or advancing rank', () => {
  const empty = progressFromCompletions([]);
  assert.equal(empty.nextBadge.name, 'First Swing');
  assert.deepEqual(earned(empty), []);
  const first = completion('first', '2026-01-11T12:00:00Z');
  const progress = progressFromCompletions([completion('second', '2026-01-12T12:00:00Z'), first]);
  assert.deepEqual([progress.level, progress.rank], [1, 'Rookie']);
  assert.deepEqual(earned(progress), ['First Swing']);
  assert.equal(progress.badges[0].earnedBy.id, 'first');
  assert.equal(progress.reading.latest, null);
  assert.equal(progress.independence.latest, null);
  assert.equal(progress.confidence.latest, null);
});

test('only the first complete five-shot check of the captured local day counts', () => {
  const earlier = completion('earlier', '2026-01-11T23:00:00Z', { confidenceBefore: 2 });
  const baseline = completion('baseline', '2026-01-11T23:40:00Z', {
    shotReads: ['correct', 'correct', 'unsure', 'correct', 'different'],
  });
  const later = completion('same-day', '2026-01-12T00:10:00Z', { shotReads: fourCorrect });
  const sameDay = progressFromCompletions([later, baseline, earlier]);
  assert.equal(sameDay.reading.baseline.completion.id, 'baseline');
  assert.equal(sameDay.reading.latest.score, 3);
  assert.deepEqual([...sameDay.reading.days], ['2026-01-12']);
  assert.equal(sameDay.nextBadge.name, 'Flight Reader');
  assert.deepEqual(earned(sameDay), ['First Swing']);

  const next = completion('next-day', '2026-01-12T23:15:00Z', { shotReads: fourCorrect });
  const progress = progressFromCompletions([next, later, baseline, earlier]);
  assert.equal(progress.reading.latest.score, 4);
  assert.equal(progress.reading.baseline.score, 3);
  assert.deepEqual(earned(progress), ['First Swing', 'Flight Reader']);
  assert.deepEqual([progress.level, progress.rank], [2, 'Scout']);
});

test('uses the server order when timestamps lost precision in serialization', () => {
  const time = '2026-01-12T00:10:00.000Z';
  const earlier = completion('00000000-0000-4000-8000-000000000002', time, {
    shotReads: ['correct', 'correct', 'unsure', 'correct', 'different'],
  });
  const later = completion('00000000-0000-4000-8000-000000000001', time, { shotReads: fourCorrect });
  const progress = progressFromCompletions([later, earlier]);
  assert.equal(progress.reading.latest.score, 3);
  assert.deepEqual(earned(progress), ['First Swing']);
});

test('independence and confidence each require two distinct recorded local days', () => {
  const first = completion('day-1', '2026-01-11T22:30:00Z', { actedIndependently: true, confidenceAfter: 4 });
  const same = completion('same-day', '2026-01-12T01:15:00Z', { actedIndependently: true, confidenceAfter: 5 });
  const under = completion('day-2-low', '2026-01-12T23:25:00Z', { actedIndependently: false, confidenceAfter: 3 });
  let progress = progressFromCompletions([under, same, first]);
  assert.deepEqual(earned(progress), ['First Swing']);
  assert.equal(progress.independence.days, 1);
  assert.equal(progress.independence.latest.unaided, false);
  assert.equal(progress.confidence.latest.score, 3);

  const next = completion('day-2', '2026-01-13T01:30:00Z', { actedIndependently: true, confidenceAfter: 4 });
  progress = progressFromCompletions([next, under, same, first]);
  assert.deepEqual(earned(progress), ['First Swing', 'Self-Starter', 'Steady Nerves']);
  assert.deepEqual([progress.level, progress.rank], [3, 'Pathfinder']);
});

test('confidence comparisons use a before/after pair from the same drill', () => {
  const before = completion('before-only', '2026-01-10T23:15:00Z', { confidenceBefore: 1 });
  const after = completion('after-only', '2026-01-11T23:15:00Z', { confidenceAfter: 3 });
  const unpaired = progressFromCompletions([after, before]);
  assert.equal(unpaired.confidence.latest.score, 3);
  assert.equal(unpaired.confidence.pair, null);
  const pair = completion('paired', '2026-01-11T00:15:00Z', { confidenceBefore: 2, confidenceAfter: 5 });
  const progress = progressFromCompletions([after, pair, before]);
  assert.equal(progress.confidence.latest.completion.id, 'after-only');
  assert.deepEqual([progress.confidence.pair.before, progress.confidence.pair.after], [2, 5]);
  assert.equal(progress.confidence.pair.completion.id, 'paired');
});

test('earning all three skill badges reaches Range Ranger and leaves no next badge', () => {
  const progress = progressFromCompletions([
    completion('2', '2026-01-02T12:00:00Z', { actedIndependently: true, confidenceAfter: 4 }),
    completion('1', '2026-01-01T12:00:00Z', { shotReads: fourCorrect, actedIndependently: true, confidenceAfter: 4 }),
  ]);
  assert.deepEqual([progress.level, progress.rank], [4, 'Range Ranger']);
  assert.deepEqual(earned(progress), ['First Swing', 'Flight Reader', 'Self-Starter', 'Steady Nerves']);
  assert.equal(progress.nextBadge, null);
});
