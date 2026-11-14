import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './src/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl },
});
