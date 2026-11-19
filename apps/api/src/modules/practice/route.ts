import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from '../auth/middleware.js';
import type { AuthEnv } from '../auth/middleware.js';
import { AuthErrorSchema, AuthHeaderSchema } from '../auth/schema.js';
import {
  CompletionInputSchema,
  CompletionListResponseSchema,
  CompletionResponseSchema,
  MatchResponseSchema,
  ShotSchema,
} from './schema.js';
import { completePractice, listCompletions, matchShot } from './service.js';

export const practiceRoute = new OpenAPIHono<AuthEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ status: 'error' as const, message: 'Invalid request' }, 400);
    }
  },
});

practiceRoute.use('*', authMiddleware);
practiceRoute.onError((error, c) => {
  // Hono recognizes HTTP exceptions by their response protocol, not class
  // identity: validators may resolve a separate installed copy of Hono.
  if ('getResponse' in error && typeof error.getResponse === 'function'
    && 'status' in error && error.status === 400) {
    return c.json({ status: 'error' as const, message: 'Invalid request' }, 400);
  }
  console.error(error);
  return c.json({ status: 'error' as const, message: 'Internal server error' }, 500);
});

const errors = {
  400: {
    description: 'Invalid JSON or request body',
    content: { 'application/json': { schema: AuthErrorSchema } },
  },
  401: {
    description: 'Missing, invalid, or expired bearer token',
    content: { 'application/json': { schema: AuthErrorSchema } },
  },
  500: {
    description: 'Internal server error',
    content: { 'application/json': { schema: AuthErrorSchema } },
  },
};

practiceRoute.openapi(
  createRoute({
    method: 'post',
    path: '/match',
    tags: ['Practice'],
    operationId: 'matchShot',
    summary: 'Find the exact drill match for a shot',
    request: {
      headers: AuthHeaderSchema,
      body: { required: true, content: { 'application/json': { schema: ShotSchema } } },
    },
    responses: {
      200: {
        description: 'Matching catalog rule, or null for an unsupported valid shot',
        content: { 'application/json': { schema: MatchResponseSchema } },
      },
      ...errors,
    },
  }),
  async (c) => c.json({ status: 'ok' as const, match: await matchShot(c.req.valid('json')) }, 200),
);

practiceRoute.openapi(
  createRoute({
    method: 'post',
    path: '/completions',
    tags: ['Practice'],
    operationId: 'completePractice',
    summary: 'Save a practice completion with a per-user idempotency key',
    request: {
      headers: AuthHeaderSchema,
      body: { required: true, content: { 'application/json': { schema: CompletionInputSchema } } },
    },
    responses: {
      201: {
        description: 'Completion created',
        content: { 'application/json': { schema: CompletionResponseSchema } },
      },
      200: {
        description: 'Original completion returned for a retry',
        content: { 'application/json': { schema: CompletionResponseSchema } },
      },
      404: {
        description: 'Unknown catalog rule',
        content: { 'application/json': { schema: AuthErrorSchema } },
      },
      409: {
        description: 'This attempt ID already belongs to a different rule for this user',
        content: { 'application/json': { schema: AuthErrorSchema } },
      },
      ...errors,
    },
  }),
  async (c) => {
    const result = await completePractice(c.get('user').id, c.req.valid('json'));
    if (result.status === 'unknownRule') {
      return c.json({ status: 'error' as const, message: 'Unknown practice rule' }, 404);
    }
    if (result.status === 'conflict') {
      return c.json({ status: 'error' as const, message: 'Attempt ID already used for a different rule' }, 409);
    }
    return c.json(
      { status: 'ok' as const, completion: result.completion },
      result.status === 'created' ? 201 : 200,
    );
  },
);

practiceRoute.openapi(
  createRoute({
    method: 'get',
    path: '/completions',
    tags: ['Practice'],
    operationId: 'listCompletions',
    summary: 'List only the authenticated user’s completions, newest first',
    request: { headers: AuthHeaderSchema },
    responses: {
      200: {
        description: 'Private completion history, ordered by completedAt descending then ID descending',
        content: { 'application/json': { schema: CompletionListResponseSchema } },
      },
      ...errors,
    },
  }),
  async (c) => c.json({ status: 'ok' as const, completions: await listCompletions(c.get('user').id) }, 200),
);
