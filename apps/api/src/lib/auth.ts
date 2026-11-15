import argon2 from 'argon2';

const DUMMY_PASSWORD = 'golf-dummy-password-for-timing';

let dummyHashPromise: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// Hashed once per process so unknown-email logins cost the same as known ones
// without re-hashing on every request.
export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash(DUMMY_PASSWORD);
  return dummyHashPromise;
}
