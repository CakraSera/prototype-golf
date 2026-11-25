import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { passwords, users } from '../../lib/db/schema.js';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
};

export type Credentials = AuthUser & { hash: string };

const userColumns = {
  id: users.id,
  username: users.username,
  email: users.email,
  fullName: users.fullName,
};

export async function findCredentialsByEmail(email: string): Promise<Credentials | null> {
  const rows = await db
    .select({ ...userColumns, hash: passwords.hash })
    .from(users)
    .innerJoin(passwords, eq(passwords.userId, users.id))
    .where(eq(users.email, email))
    .limit(1);

  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const rows = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1);

  return rows[0] ?? null;
}

export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        fullName: input.username,
      })
      .returning(userColumns);

    const user = inserted[0];
    if (user === undefined) {
      throw new Error('User insert returned no row');
    }

    await tx.insert(passwords).values({ userId: user.id, hash: input.passwordHash });

    return user;
  });
}

// Drizzle wraps driver errors, so walk the cause chain for PostgreSQL's
// unique_violation code.
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }
    if ('code' in current && current.code === '23505') {
      return true;
    }
    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}
