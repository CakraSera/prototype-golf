import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { HealthResponse } from '@golf/shared';

export const healthRoute = new OpenAPIHono();

healthRoute.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Health'],
    operationId: 'getHealth',
    summary: 'Check API liveness',
    responses: {
      200: {
        description: 'The API is running. This does not check database connectivity.',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.literal('ok'),
                time: z.iso.datetime(),
              })
              .openapi('HealthResponse'),
          },
        },
      },
    },
  }),
  (c) => {
    const body: HealthResponse = {
      status: 'ok',
      time: new Date().toISOString(),
    };
    return c.json(body, 200);
  },
);
