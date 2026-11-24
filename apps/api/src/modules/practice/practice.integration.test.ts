import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { AuthUser, Completion, DrillMatch, LoginResult, Shot } from '@golf/shared';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { app as productionApp } from '../../app.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const catalog: DrillMatch[] = [
  {
    ruleId: 'r01',
    shot: { start: 'right', curve: 'straight', height: 'normal' },
    feedback: 'Your shot started right and stayed on that line.',
    drill: {
      id: 'd01',
      title: 'Start-line check',
      instruction: 'Pick a visible target and call the starting direction of your next shot.',
    },
  },
  {
    ruleId: 'r02',
    shot: { start: 'straight', curve: 'right', height: 'normal' },
    feedback: 'Your shot started on target and curved right.',
    drill: {
      id: 'd02',
      title: 'Curve check',
      instruction: 'Call the starting line and finishing side of your next shot.',
    },
  },
  {
    ruleId: 'r03',
    shot: { start: 'straight', curve: 'straight', height: 'low' },
    feedback: 'Your shot stayed on line and flew low.',
    drill: {
      id: 'd03',
      title: 'Height check',
      instruction: 'Classify the height of your next shot as low, normal or high.',
    },
  },
];

describe('authenticated practice with PostgreSQL', {
  skip: !testDatabaseUrl ? 'Set TEST_DATABASE_URL to an isolated PostgreSQL 18 database' : false,
  concurrency: false,
}, () => {
  const schemaName = `practice_test_${randomUUID().replaceAll('-', '')}`;
  let adminPool: Pool | undefined;
  let migrationPool: Pool | undefined;
  let productionPool: Pool | undefined;
  let migrationsDirectory: string | undefined;
  let app: typeof productionApp;
  let alice: { token: string; userId: string };
  let bob: { token: string; userId: string };
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousJwtSecret = process.env.JWT_SECRET_KEY;

  function request(path: string, options: { token?: string; body?: unknown; raw?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    const hasBody = options.body !== undefined || options.raw !== undefined;
    if (hasBody) headers.set('Content-Type', 'application/json');
    return app.request(path, {
      method: hasBody ? 'POST' : 'GET',
      headers,
      ...(hasBody ? { body: options.raw ?? JSON.stringify(options.body) } : {}),
    });
  }

  async function account(username: string) {
    const email = `${username}@example.com`;
    const password = 'an integration test password';
    const registered = await request('/auth/register', {
      body: { username, email, password, fullName: `${username} Golfer` },
    });
    assert.equal(registered.status, 201);
    const registration = await registered.json() as { status: string; user: AuthUser };
    assert.equal(registration.status, 'ok');
    assert.equal(registration.user.email, email);
    const login = await request('/auth/login', { body: { email, password } });
    assert.equal(login.status, 200);
    const loggedIn = await login.json() as LoginResult;
    assert.equal(loggedIn.user.id, registration.user.id);
    assert.equal(typeof loggedIn.accessToken, 'string');
    return { token: loggedIn.accessToken, userId: loggedIn.user.id };
  }

  async function save(token: string, id: string, ruleId = 'r01', userId?: string) {
    return request('/practice/completions', { token, body: { id, ruleId, userId } });
  }

  async function history(token: string, query = ''): Promise<Completion[]> {
    const response = await request(`/practice/completions${query}`, { token });
    assert.equal(response.status, 200);
    const body = await response.json() as { status: string; completions: Completion[] };
    assert.equal(body.status, 'ok');
    return body.completions;
  }

  async function errorResponse(response: Response, status: number) {
    assert.equal(response.status, status);
    const body = await response.json() as { status: string; message: string };
    assert.equal(body.status, 'error');
    assert.equal(typeof body.message, 'string');
    assert.notEqual(body.message.length, 0);
  }

  before(async () => {
    assert.ok(testDatabaseUrl);
    adminPool = new Pool({ connectionString: testDatabaseUrl });
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    const url = new URL(testDatabaseUrl);
    url.searchParams.set('options', `-c search_path=${schemaName}`);
    process.env.DATABASE_URL = url.toString();
    process.env.JWT_SECRET_KEY = randomUUID() + randomUUID();
    migrationPool = new Pool({ connectionString: url.toString() });
    migrationsDirectory = await mkdtemp(join(tmpdir(), 'golf-practice-migrations-'));
    await cp(fileURLToPath(new URL('../../../drizzle', import.meta.url)), migrationsDirectory, {
      recursive: true,
    });
    // Drizzle emits explicit public-schema foreign keys. Relocate only those
    // references in a temporary migration copy; never touch public or repo files.
    for (const file of await readdir(migrationsDirectory)) {
      if (!file.endsWith('.sql')) continue;
      const path = join(migrationsDirectory, file);
      const sql = await readFile(path, 'utf8');
      await writeFile(path, sql.replaceAll('"public".', `"${schemaName}".`));
    }
    const migrationDb = drizzle(migrationPool);
    const config = { migrationsFolder: migrationsDirectory, migrationsSchema: schemaName };
    await migrate(migrationDb, config);
    await migrate(migrationDb, config);
    // Loading the real app is intentionally deferred until its environment and
    // isolated database exist; static value imports would bind the wrong pool.
    ({ pool: productionPool } = await import('../../lib/db/index.js'));
    ({ app } = await import('../../app.js'));
    alice = await account('alice');
    bob = await account('bob');
  });

  after(async () => {
    try {
      await productionPool?.end();
    } finally {
      try {
        await migrationPool?.end();
      } finally {
        try {
          await adminPool?.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        } finally {
          await adminPool?.end();
          if (migrationsDirectory) await rm(migrationsDirectory, { recursive: true, force: true });
          if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
          else process.env.DATABASE_URL = previousDatabaseUrl;
          if (previousJwtSecret === undefined) delete process.env.JWT_SECRET_KEY;
          else process.env.JWT_SECRET_KEY = previousJwtSecret;
        }
      }
    }
  });

  it('preserves health, registration, login and authenticated identity', async () => {
    assert.equal((await request('/health')).status, 200);
    const me = await request('/auth/me', { token: alice.token });
    assert.equal(me.status, 200);
    assert.equal((await me.json() as { user: AuthUser }).user.id, alice.userId);
    await errorResponse(await request('/auth/login', {
      body: { email: 'alice@example.com', password: 'incorrect' },
    }), 401);
  });

  it('requires a real bearer on every practice endpoint', async () => {
    for (const token of [undefined, 'not-a-token']) {
      await errorResponse(await request('/practice/match', {
        token, body: { start: 'right', curve: 'straight', height: 'normal' },
      }), 401);
      await errorResponse(await request('/practice/completions', {
        token, body: { id: randomUUID(), ruleId: 'r01' },
      }), 401);
      await errorResponse(await request('/practice/completions', { token }), 401);
    }
  });

  it('matches only the three seeded combinations and leaves all other valid shots unmatched', async () => {
    const directions = ['left', 'straight', 'right'] as const;
    const heights = ['low', 'normal', 'high'] as const;
    for (const start of directions) {
      for (const curve of directions) {
        for (const height of heights) {
          const shot: Shot = { start, curve, height };
          const response = await request('/practice/match', { token: alice.token, body: shot });
          assert.equal(response.status, 200);
          const expected = catalog.find((entry) => entry.shot.start === start
            && entry.shot.curve === curve && entry.shot.height === height) ?? null;
          assert.deepEqual(await response.json(), { status: 'ok', match: expected });
        }
      }
    }
  });

  it('rejects invalid enums, incomplete input, invalid IDs and malformed JSON with JSON errors', async () => {
    for (const body of [
      { start: 'up', curve: 'straight', height: 'normal' },
      { start: 'right', curve: 'hook', height: 'normal' },
      { start: 'right', curve: 'straight', height: 'medium' },
      { start: 'right', curve: 'straight' },
      null,
    ]) {
      await errorResponse(await request('/practice/match', { token: alice.token, body }), 400);
    }
    for (const body of [{ id: 'not-a-uuid', ruleId: 'r01' }, { id: randomUUID() }]) {
      await errorResponse(await request('/practice/completions', { token: alice.token, body }), 400);
    }
    for (const path of ['/practice/match', '/practice/completions']) {
      await errorResponse(await request(path, { token: alice.token, raw: '{' }), 400);
    }
  });

  it('returns the original server timestamp and one record on sequential retries', async () => {
    const id = randomUUID();
    const first = await save(alice.token, id);
    assert.equal(first.status, 201);
    const saved = await first.json() as { status: string; completion: Completion };
    assert.equal(saved.status, 'ok');
    assert.equal(saved.completion.id, id);
    assert.equal(saved.completion.ruleId, 'r01');
    assert.deepEqual(saved.completion.match, catalog[0]);
    assert.ok(Number.isFinite(Date.parse(saved.completion.completedAt)));
    assert.equal('checkIn' in saved.completion, false);
    const retry = await save(alice.token, id);
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), saved);
    assert.deepEqual((await history(alice.token)).filter((row) => row.id === id), [saved.completion]);
  });

  it('keeps a valid session retryable when account lookup fails during a save', async () => {
    assert.ok(migrationPool);
    const id = randomUUID();
    await migrationPool.query('ALTER TABLE users RENAME TO unavailable_users');
    try {
      const failed = await save(alice.token, id);
      await errorResponse(failed, 500);
      assert.equal(failed.headers.has('WWW-Authenticate'), false);
    } finally {
      await migrationPool.query('ALTER TABLE unavailable_users RENAME TO users');
    }

    assert.equal((await save(alice.token, id)).status, 201);
    assert.equal((await save(alice.token, id)).status, 200);
    assert.equal((await history(alice.token)).filter(row => row.id === id).length, 1);
  });

  it('serializes concurrent retries into one creation and identical records', async () => {
    const id = randomUUID();
    const responses = await Promise.all(Array.from({ length: 8 }, () => save(alice.token, id, 'r02')));
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.status === 200).length, 7);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    for (const body of bodies) assert.deepEqual(body, bodies[0]);
    assert.equal((await history(alice.token)).filter((row) => row.id === id).length, 1);
  });

  it('stores optional observations once, including the winner of a concurrent save', async () => {
    const id = randomUUID();
    const checkIns = [
      { utcOffsetMinutes: 420, actedIndependently: false, confidenceBefore: 2, confidenceAfter: 4,
        shotReads: ['correct', 'correct', 'different', 'correct', 'correct'] },
      { utcOffsetMinutes: -480, actedIndependently: true, confidenceAfter: 5 },
    ];
    const responses = await Promise.all(checkIns.map(checkIn =>
      request('/practice/completions', { token: alice.token, body: { id, ruleId: 'r01', checkIn } }),
    ));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 201]);
    const winner = responses.findIndex(response => response.status === 201);
    const bodies = await Promise.all(responses.map(response => response.json() as Promise<{ completion: Completion }>));
    assert.deepEqual(bodies[0], bodies[1]);
    assert.deepEqual(bodies[winner]!.completion.checkIn, checkIns[winner]);
    assert.deepEqual(await (await save(alice.token, id)).json(), bodies[winner]);
    assert.deepEqual((await history(alice.token)).filter(row => row.id === id), [bodies[winner]!.completion]);
    assert.equal((await history(bob.token)).some(row => row.id === id), false);
  });

  it('omits an offset-only check-in but keeps an explicit needed-help observation', async () => {
    const checkIns = [{ utcOffsetMinutes: 420 }, { utcOffsetMinutes: 420, actedIndependently: false }];
    const [withoutEvidence, neededHelp] = await Promise.all(checkIns.map(async checkIn => {
      const response = await request('/practice/completions', {
        token: alice.token, body: { id: randomUUID(), ruleId: 'r01', checkIn },
      });
      assert.equal(response.status, 201);
      const data = await response.json() as { completion: Completion };
      return data.completion;
    }));
    assert.equal('checkIn' in withoutEvidence!, false);
    assert.deepEqual(neededHelp!.checkIn, checkIns[1]);
    const stored = await history(alice.token);
    assert.deepEqual(stored.find(row => row.id === withoutEvidence!.id), withoutEvidence);
    assert.deepEqual(stored.find(row => row.id === neededHelp!.id), neededHelp);
  });

  it('rejects invalid evidence without recording the completion', async () => {
    const id = randomUUID();
    const utcOffsetMinutes = 420;
    for (const checkIn of [
      { utcOffsetMinutes, confidenceAfter: 6 },
      { utcOffsetMinutes, confidenceBefore: 2.5 },
      { utcOffsetMinutes, actedIndependently: 'yes' },
      { utcOffsetMinutes, shotReads: ['correct', 'correct', 'correct', 'correct'] },
      { utcOffsetMinutes, shotReads: ['correct', 'correct', 'correct', 'correct', 'almost'] },
      { utcOffsetMinutes: 841, confidenceAfter: 4 },
    ]) {
      await errorResponse(await request('/practice/completions', {
        token: alice.token, body: { id, ruleId: 'r01', checkIn },
      }), 400);
    }
    assert.equal((await history(alice.token)).some(row => row.id === id), false);
  });

  it('rejects a different rule for an existing attempt without replacing it', async () => {
    const id = randomUUID();
    const first = await save(alice.token, id);
    assert.equal(first.status, 201);
    const original = await first.json();
    await errorResponse(await save(alice.token, id, 'r02'), 409);
    const retry = await save(alice.token, id);
    assert.deepEqual(await retry.json(), original);
  });

  it('lets exactly one concurrent rule win an attempt ID without overwriting it', async () => {
    const id = randomUUID();
    const responses = await Promise.all([
      save(alice.token, id, 'r01'),
      save(alice.token, id, 'r03'),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const created = responses.find((response) => response.status === 201)!;
    const original = await created.json() as { completion: Completion };
    const rows = (await history(alice.token)).filter((row) => row.id === id);
    assert.deepEqual(rows, [original.completion]);
    const retry = await save(alice.token, id, original.completion.ruleId);
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), original);
  });

  it('rejects an unknown rule without creating a completion', async () => {
    const id = randomUUID();
    await errorResponse(await save(alice.token, id, 'unknown-rule'), 404);
    assert.equal((await history(alice.token)).some((row) => row.id === id), false);
  });

  it('scopes attempts and history to the bearer, ignoring supplied user identity', async () => {
    const id = randomUUID();
    const aliceSaved = await save(alice.token, id, 'r01', bob.userId);
    assert.equal(aliceSaved.status, 201);
    assert.equal((await history(bob.token, `?userId=${alice.userId}`)).some((row) => row.id === id), false);
    const bobSaved = await save(bob.token, id, 'r03', alice.userId);
    assert.equal(bobSaved.status, 201);
    assert.equal((await history(alice.token)).find((row) => row.id === id)?.ruleId, 'r01');
    assert.equal((await history(bob.token)).find((row) => row.id === id)?.ruleId, 'r03');
  });

  it('orders history by server completion time descending, then ID descending', async () => {
    const lowerId = '00000000-0000-4000-8000-000000000001';
    const higherId = '00000000-0000-4000-8000-000000000002';
    const newestId = randomUUID();
    for (const id of [lowerId, higherId, newestId]) {
      assert.equal((await save(alice.token, id)).status, 201);
    }
    // Set tied timestamps in this run's isolated schema to exercise the tie-break.
    await migrationPool!.query(
      'UPDATE practice_completions SET completed_at = $1 WHERE user_id = $2 AND id = ANY($3::uuid[])',
      ['2020-01-01T00:00:00.000Z', alice.userId, [lowerId, higherId]],
    );
    const rows = await history(alice.token);
    const ids = rows.map((row) => row.id);
    assert.ok(ids.indexOf(newestId) < ids.indexOf(higherId));
    assert.ok(ids.indexOf(higherId) < ids.indexOf(lowerId));
    for (let index = 1; index < rows.length; index += 1) {
      assert.ok(Date.parse(rows[index - 1]!.completedAt) >= Date.parse(rows[index]!.completedAt));
    }
  });
});
