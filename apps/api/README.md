# Golf API

Node.js + Hono, PostgreSQL + Drizzle, OpenAPI 3.1 + Scalar.

## Local development

From the repository root (Node >=22, pnpm, and Docker Compose required):

```sh
pnpm install
cp .env.example .env
# Uses local-only development credentials; do not use these in production.
docker compose up -d --wait
pnpm dev:api
```

The API and Drizzle scripts load the repository-root `.env` through `dotenv-cli` (`pnpm with-env`), including `${VAR}` expansion inside it. Variables already set in the shell take precedence. `DATABASE_URL` is required; `PORT` defaults to `3000`. For hosted PostgreSQL, set `DATABASE_URL` to the provider's connection URL, including its required SSL options.

`apps/api/db/Dockerfile` pins `postgres:18.6` and adds a TCP `pg_isready` health check; the root `docker-compose.yaml` builds it as the `database` service. `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` come from `.env` and only take effect when the volume is empty.

PostgreSQL 18 stores its data in `/var/lib/postgresql/18/docker`, so the `postgres-data` volume mounts at `/var/lib/postgresql`, not the older `/var/lib/postgresql/data`. Mounting the wrong path makes data vanish on container re-creation.

- Scalar API reference: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/openapi.json
- Liveness: http://localhost:3000/health (does not query the database)

The documentation is currently public, like `/health`. Protect it if protected endpoints are introduced. Scalar loads its browser bundle from its default jsDelivr CDN, so rendering requires network access.

Stop local PostgreSQL without deleting its data:

```sh
docker compose down
```

Rebuild the database image after editing `db/Dockerfile`:

```sh
docker compose build database
```

Delete the `postgres-data` volume, then start again, to re-run first-start initialization from a clean database.

## Database workflow

`src/lib/db/index.ts` exports the shared `db` and `pool`. Application code uses `db`; the server closes `pool` on shutdown. The API does not apply migrations automatically.

This infrastructure-only setup intentionally contains no application tables. `src/lib/db/schema.ts` is the schema entrypoint. The initial migration journal is empty; generation reports no schema changes, and migration only initializes Drizzle's migration metadata.

After defining application tables in that schema file:

```sh
pnpm --filter @golf/api db:generate
# Review and commit generated SQL and metadata under apps/api/drizzle/.
pnpm --filter @golf/api db:migrate
```

Use the same migration command with the target environment's `DATABASE_URL` during deployment. Do not use the example development credentials outside local development.

```sh
pnpm --filter @golf/api db:studio
pnpm --filter @golf/api typecheck
```

Stable Drizzle ORM and Kit versions are pinned together rather than copying the reference project's release candidates.

## Documenting routes

Register HTTP routes with `createRoute` and `app.openapi` from `@hono/zod-openapi`, as demonstrated by `/health` in `src/app.ts`. Their schemas generate `/openapi.json`; Scalar reads that document. Plain `app.get` routes are not automatically documented. `src/index.ts` owns server startup separately from the app.

## References

- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Hono best practices](https://hono.dev/docs/guides/best-practices)
- [Scalar Hono integration](https://scalar.com/products/api-references/integrations/hono)
- [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Drizzle migrations](https://orm.drizzle.team/docs/drizzle-kit-migrate)
