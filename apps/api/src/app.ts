import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoute } from './modules/auth/route.js';
import { healthRoute } from './modules/health/route.js';

export const app = new OpenAPIHono();

app.use(logger());
app.use('*', cors());

app.route('/health', healthRoute);
app.route('/auth', authRoute);

app.route(
  '/',
  Scalar.serve({
    pageTitle: 'Golf API Reference',
    document: () =>
      app.getOpenAPI31Document({
        openapi: '3.1.0',
        info: {
          title: 'Golf API',
          version: '0.0.0',
        },
        servers: [{ url: '/' }],
      }),
  }),
);
