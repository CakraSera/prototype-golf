import 'dotenv/config';

const value = process.env.DATABASE_URL;

if (value === undefined || value.trim() === '') {
  throw new Error('DATABASE_URL is required. Set it in apps/api/.env or the environment.');
}

export const databaseUrl = value;
