import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import type { HealthResponse } from '@golf/shared';

export const app = new OpenAPIHono();

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  operationId: 'getHealth',
  tags: ['Health'],
  summary: 'Check API liveness',
  responses: {
    200: {
      description: 'The API is running. This does not check database connectivity.',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            time: z.iso.datetime(),
          }).openapi('HealthResponse'),
        },
      },
    },
  },
});

app.openapi(healthRoute, (c) => {
  const body: HealthResponse = {
    status: 'ok',
    time: new Date().toISOString(),
  };
  return c.json(body, 200);
});

app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Golf API',
    version: '0.0.0',
  },
  servers: [{ url: '/' }],
});

app.get('/', Scalar({
  url: '/openapi.json',
  pageTitle: 'Golf API Reference',
}));
