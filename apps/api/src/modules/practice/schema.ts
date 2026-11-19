import { z } from '@hono/zod-openapi';

const direction = z.enum(['left', 'straight', 'right']);

export const ShotSchema = z.object({
  start: direction,
  curve: direction,
  height: z.enum(['low', 'normal', 'high']),
}).openapi('Shot');

export const DrillMatchSchema = z.object({
  ruleId: z.string(),
  shot: ShotSchema,
  feedback: z.string(),
  drill: z.object({
    id: z.string(),
    title: z.string(),
    instruction: z.string(),
  }),
}).openapi('DrillMatch');

export const CompletionInputSchema = z.object({
  id: z.uuid(),
  ruleId: z.string(),
}).openapi('CompletionInput');

export const CompletionSchema = z.object({
  id: z.uuid(),
  ruleId: z.string(),
  completedAt: z.iso.datetime(),
  match: DrillMatchSchema,
}).openapi('Completion');

export const MatchResponseSchema = z.object({
  status: z.literal('ok'),
  match: DrillMatchSchema.nullable(),
}).openapi('MatchResponse');

export const CompletionResponseSchema = z.object({
  status: z.literal('ok'),
  completion: CompletionSchema,
}).openapi('CompletionResponse');

export const CompletionListResponseSchema = z.object({
  status: z.literal('ok'),
  completions: z.array(CompletionSchema),
}).openapi('CompletionListResponse');
