import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id: id(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  fullName: varchar('full_name', { length: 80 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const passwords = pgTable('passwords', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  hash: varchar('hash', { length: 255 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const drills = pgTable('drills', {
  id: varchar('id', { length: 32 }).primaryKey(),
  title: text('title').notNull(),
  instruction: text('instruction').notNull(),
});

export const shotRules = pgTable(
  'shot_rules',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    start: varchar('start', { length: 8, enum: ['left', 'straight', 'right'] }).notNull(),
    curve: varchar('curve', { length: 8, enum: ['left', 'straight', 'right'] }).notNull(),
    height: varchar('height', { length: 6, enum: ['low', 'normal', 'high'] }).notNull(),
    feedback: text('feedback').notNull(),
    drillId: varchar('drill_id', { length: 32 }).notNull().references(() => drills.id),
  },
  (table) => [
    unique('shot_rules_shot_unique').on(table.start, table.curve, table.height),
    check('shot_rules_start_check', sql`${table.start} in ('left', 'straight', 'right')`),
    check('shot_rules_curve_check', sql`${table.curve} in ('left', 'straight', 'right')`),
    check('shot_rules_height_check', sql`${table.height} in ('low', 'normal', 'high')`),
  ],
);

export const practiceCompletions = pgTable(
  'practice_completions',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    id: uuid('id').notNull(),
    ruleId: varchar('rule_id', { length: 32 }).notNull().references(() => shotRules.id),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index('practice_completions_history_idx').on(table.userId, table.completedAt.desc(), table.id.desc()),
  ],
);
