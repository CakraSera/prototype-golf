/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Completion } from '@golf/shared';
import { buildProgressSummary } from './progress-summary';

function completion(id: string, completedAt: string): Completion {
  return {
    id,
    completedAt,
    ruleId: 'same-rule',
    match: {
      ruleId: 'same-rule',
      shot: { start: 'straight', curve: 'right', height: 'normal' },
      feedback: 'Practice feedback',
      drill: { id: 'same-drill', title: 'Practice drill', instruction: 'Practice' },
    },
  };
}

// TZ is process-global: every callback is synchronous and this suite is serial.
// node:test isolates separate test files in separate processes by default.
function inTimezone(timezone: string, run: () => void): void {
  const original = process.env.TZ;
  process.env.TZ = timezone;
  try {
    run();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

describe('buildProgressSummary', { concurrency: false }, () => {
  test('returns seven oldest-first local dates and zero counts for empty history', () => {
    inTimezone('Asia/Jakarta', () => {
      const summary = buildProgressSummary([], new Date('2026-11-20T12:00:00+07:00'));
      assert.deepEqual(summary.days.map(({ key, count }) => ({ key, count })), [
        { key: '2026-11-14', count: 0 },
        { key: '2026-11-15', count: 0 },
        { key: '2026-11-16', count: 0 },
        { key: '2026-11-17', count: 0 },
        { key: '2026-11-18', count: 0 },
        { key: '2026-11-19', count: 0 },
        { key: '2026-11-20', count: 0 },
      ]);
      assert.equal(summary.drillsCompleted, 0);
      assert.equal(summary.daysPracticed, 0);
      assert.equal(summary.invalidTimestampCount, 0);
      for (const day of summary.days) {
        assert.equal(day.date.getHours(), 0);
        assert.equal(day.date.getMinutes(), 0);
        assert.equal(day.date.getDate(), Number(day.key.slice(-2)));
      }
    });
  });

  test('counts distinct attempts on the same drill and day but deduplicates IDs', () => {
    inTimezone('UTC', () => {
      const first = completion('first', '2026-11-20T08:00:00Z');
      const summary = buildProgressSummary([
        first,
        completion('second', '2026-11-20T09:00:00Z'),
        { ...first },
        completion('third', '2026-11-19T08:00:00Z'),
      ], new Date('2026-11-20T12:00:00Z'));
      assert.deepEqual(summary.days.map((day) => day.count), [0, 0, 0, 0, 0, 1, 2]);
      assert.equal(summary.drillsCompleted, 3);
      assert.equal(summary.daysPracticed, 2);
    });
  });

  test('includes the first local midnight and excludes the preceding instant', () => {
    inTimezone('Asia/Jakarta', () => {
      const summary = buildProgressSummary([
        completion('included', '2026-11-14T00:00:00+07:00'),
        completion('excluded', '2026-11-13T23:59:59.999+07:00'),
      ], new Date('2026-11-20T12:00:00+07:00'));
      assert.deepEqual(summary.days.map((day) => day.count), [1, 0, 0, 0, 0, 0, 0]);
      assert.equal(summary.drillsCompleted, 1);
    });
  });

  test('buckets UTC timestamps by the Jakarta date rather than the UTC date', () => {
    inTimezone('Asia/Jakarta', () => {
      const summary = buildProgressSummary([
        completion('yesterday', '2026-11-19T16:59:59Z'),
        completion('today', '2026-11-19T17:00:00Z'),
        completion('tomorrow', '2026-11-20T17:00:00Z'),
      ], new Date('2026-11-20T12:00:00+07:00'));
      assert.deepEqual(summary.days.map((day) => day.count), [0, 0, 0, 0, 0, 1, 1]);
      assert.equal(summary.drillsCompleted, 2);
    });
  });

  test('rolls calendar dates across month and year boundaries', () => {
    inTimezone('UTC', () => {
      const summary = buildProgressSummary([], new Date('2027-01-03T12:00:00Z'));
      assert.deepEqual(summary.days.map((day) => day.key), [
        '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
        '2027-01-01', '2027-01-02', '2027-01-03',
      ]);
    });
  });

  test('keeps seven local dates through New York spring DST', () => {
    inTimezone('America/New_York', () => {
      const summary = buildProgressSummary([
        completion('first', '2026-03-05T00:00:00-05:00'),
        completion('before-jump', '2026-03-08T01:59:59-05:00'),
        completion('after-jump', '2026-03-08T03:00:00-04:00'),
      ], new Date('2026-03-11T12:00:00-04:00'));
      assert.deepEqual(summary.days.map((day) => day.key), [
        '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08',
        '2026-03-09', '2026-03-10', '2026-03-11',
      ]);
      assert.deepEqual(summary.days.map((day) => day.count), [1, 0, 0, 2, 0, 0, 0]);
      assert.equal(summary.daysPracticed, 2);
    });
  });

  test('keeps seven local dates and both repeated hours through New York fall DST', () => {
    inTimezone('America/New_York', () => {
      const summary = buildProgressSummary([
        completion('first', '2026-10-29T00:00:00-04:00'),
        completion('first-hour', '2026-11-01T01:30:00-04:00'),
        completion('repeated-hour', '2026-11-01T01:30:00-05:00'),
      ], new Date('2026-11-04T12:00:00-05:00'));
      assert.deepEqual(summary.days.map((day) => day.key), [
        '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
        '2026-11-02', '2026-11-03', '2026-11-04',
      ]);
      assert.deepEqual(summary.days.map((day) => day.count), [1, 0, 0, 2, 0, 0, 0]);
      assert.equal(summary.drillsCompleted, 3);
    });
  });

  test('omits invalid timestamps with a diagnostic count and excludes future dates', () => {
    inTimezone('UTC', () => {
      const invalid = completion('invalid', 'not-a-date');
      const summary = buildProgressSummary([
        invalid,
        { ...invalid },
        completion('empty', ''),
        completion('future', '2026-11-21T00:00:00Z'),
        completion('today', '2026-11-20T23:59:59Z'),
      ], new Date('2026-11-20T12:00:00Z'));
      assert.equal(summary.invalidTimestampCount, 2);
      assert.equal(summary.drillsCompleted, 1);
      assert.equal(summary.daysPracticed, 1);
      assert.deepEqual(summary.days.map((day) => day.count), [0, 0, 0, 0, 0, 0, 1]);
    });
  });

  test('advances the window at local midnight without mutating inputs or now', () => {
    inTimezone('Asia/Jakarta', () => {
      const history = Object.freeze([
        Object.freeze(completion('oldest', '2026-11-14T12:00:00+07:00')),
        Object.freeze(completion('latest', '2026-11-20T12:00:00+07:00')),
      ]);
      const snapshot = JSON.stringify(history);
      const before = new Date('2026-11-20T23:59:59.999+07:00');
      const beforeTime = before.getTime();
      const after = new Date('2026-11-21T00:00:00+07:00');
      const beforeSummary = buildProgressSummary(history, before);
      const afterSummary = buildProgressSummary(history, after);
      assert.equal(beforeSummary.days[0].key, '2026-11-14');
      assert.equal(beforeSummary.drillsCompleted, 2);
      assert.equal(afterSummary.days[0].key, '2026-11-15');
      assert.equal(afterSummary.days[6].key, '2026-11-21');
      assert.equal(afterSummary.drillsCompleted, 1);
      assert.equal(afterSummary.days[6].count, 0);
      assert.equal(before.getTime(), beforeTime);
      assert.equal(JSON.stringify(history), snapshot);
    });
  });
});
