import type { Completion, CompletionInput, Direction, Drill, DrillMatch, FlightHeight, Shot } from '@golf/shared';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { drills, practiceCompletions, shotRules } from '../../lib/db/schema.js';

const matchColumns = {
  ruleId: shotRules.id,
  start: shotRules.start,
  curve: shotRules.curve,
  height: shotRules.height,
  feedback: shotRules.feedback,
  drill: { id: drills.id, title: drills.title, instruction: drills.instruction },
};

const completionColumns = {
  ...matchColumns,
  id: practiceCompletions.id,
  completedAt: practiceCompletions.completedAt,
};

type MatchRow = {
  ruleId: string;
  start: Direction;
  curve: Direction;
  height: FlightHeight;
  feedback: string;
  drill: Drill;
};

function toMatch(row: MatchRow): DrillMatch {
  return {
    ruleId: row.ruleId,
    shot: { start: row.start, curve: row.curve, height: row.height },
    feedback: row.feedback,
    drill: row.drill,
  };
}

function toCompletion(row: MatchRow & { id: string; completedAt: Date }): Completion {
  return {
    id: row.id,
    ruleId: row.ruleId,
    completedAt: row.completedAt.toISOString(),
    match: toMatch(row),
  };
}

export async function matchShot(shot: Shot): Promise<DrillMatch | null> {
  const [row] = await db.select(matchColumns).from(shotRules)
    .innerJoin(drills, eq(shotRules.drillId, drills.id))
    .where(and(
      eq(shotRules.start, shot.start),
      eq(shotRules.curve, shot.curve),
      eq(shotRules.height, shot.height),
    ))
    .limit(1);
  return row ? toMatch(row) : null;
}

async function findCompletion(userId: string, id: string): Promise<Completion | null> {
  const [row] = await db.select(completionColumns).from(practiceCompletions)
    .innerJoin(shotRules, eq(practiceCompletions.ruleId, shotRules.id))
    .innerJoin(drills, eq(shotRules.drillId, drills.id))
    .where(and(eq(practiceCompletions.userId, userId), eq(practiceCompletions.id, id)))
    .limit(1);
  return row ? toCompletion(row) : null;
}

type SaveResult =
  | { status: 'created' | 'existing'; completion: Completion }
  | { status: 'conflict' }
  | { status: 'unknownRule' };

export async function completePractice(userId: string, input: CompletionInput): Promise<SaveResult> {
  const existing = await findCompletion(userId, input.id);
  if (existing) {
    return existing.ruleId === input.ruleId
      ? { status: 'existing', completion: existing }
      : { status: 'conflict' };
  }

  const [rule] = await db.select(matchColumns).from(shotRules)
    .innerJoin(drills, eq(shotRules.drillId, drills.id))
    .where(eq(shotRules.id, input.ruleId)).limit(1);
  if (!rule) return { status: 'unknownRule' };

  const [inserted] = await db.insert(practiceCompletions)
    .values({ userId, id: input.id, ruleId: input.ruleId })
    .onConflictDoNothing({ target: [practiceCompletions.userId, practiceCompletions.id] })
    .returning({ id: practiceCompletions.id, completedAt: practiceCompletions.completedAt });
  if (inserted) {
    return { status: 'created', completion: toCompletion({ ...rule, ...inserted }) };
  }

  // ON CONFLICT waits for a competing insert to commit. A separate statement
  // then sees the winner at PostgreSQL's default READ COMMITTED isolation.
  const winner = await findCompletion(userId, input.id);
  if (!winner) throw new Error('Conflicting completion disappeared');
  return winner.ruleId === input.ruleId
    ? { status: 'existing', completion: winner }
    : { status: 'conflict' };
}

export async function listCompletions(userId: string): Promise<Completion[]> {
  const rows = await db.select(completionColumns).from(practiceCompletions)
    .innerJoin(shotRules, eq(practiceCompletions.ruleId, shotRules.id))
    .innerJoin(drills, eq(shotRules.drillId, drills.id))
    .where(eq(practiceCompletions.userId, userId))
    .orderBy(desc(practiceCompletions.completedAt), desc(practiceCompletions.id));
  return rows.map(toCompletion);
}
