const value = process.env.DATABASE_URL;

if (value === undefined || value.trim() === '') {
  throw new Error('DATABASE_URL is required. Set it in the environment, or use the dev/db scripts, which load ../../.env.');
}

export const databaseUrl = value;
