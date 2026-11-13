import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { HealthResponse } from '@golf/shared';

const app = new Hono();

app.get('/health', (c) => {
  const body: HealthResponse = {
    status: 'ok',
    time: new Date().toISOString(),
  };
  return c.json(body);
});

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, ({ port: boundPort }) => {
  console.log(`api listening on http://localhost:${boundPort}`);
});
