import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../../lib/token.js';
import { getUserById, type AuthUser } from './service.js';

export type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

function unauthorized(c: Context<AuthEnv>) {
  c.header('WWW-Authenticate', 'Bearer');
  return c.json({ status: 'error' as const, message: 'Unauthorized' }, 401);
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (token === undefined) {
    return unauthorized(c);
  }

  try {
    const user = await getUserById(await verifyAccessToken(token));
    if (user === null) {
      return unauthorized(c);
    }
    c.set('user', user);
  } catch {
    return unauthorized(c);
  }

  await next();
});
