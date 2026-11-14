const value = process.env.DATABASE_URL;

if (value === undefined || value.trim() === '') {
  throw new Error('DATABASE_URL is required. Run through the package scripts (which load ../../.env) or set it in the environment.');
}

export const databaseUrl = value;
