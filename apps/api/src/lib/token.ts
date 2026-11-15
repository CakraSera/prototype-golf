import { sign, verify } from 'hono/jwt';
import { jwtSecret } from '../env.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export function signAccessToken(userId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return sign(
    {
      sub: userId,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    },
    jwtSecret,
    'HS256',
  );
}

export async function verifyAccessToken(token: string): Promise<string> {
  const payload = await verify(token, jwtSecret, 'HS256');

  if (typeof payload.sub !== 'string' || payload.sub === '') {
    throw new Error('Token is missing a subject');
  }

  return payload.sub;
}
