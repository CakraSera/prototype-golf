import { serve } from '@hono/node-server';
import { app } from './app.js';
import { pool } from './lib/db/index.js';

const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: app.fetch, port }, ({ port: boundPort }) => {
  console.log(`api listening on http://localhost:${boundPort}`);
});

const shutdown = () => {
  server.close(() => {
    void pool.end();
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
