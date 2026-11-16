const databaseUrlValue = process.env.DATABASE_URL;

if (databaseUrlValue === undefined || databaseUrlValue.trim() === '') {
  throw new Error('DATABASE_URL is required. Set it in the environment, or use the dev/db scripts, which load ../../.env.');
}

const jwtSecretValue = process.env.JWT_SECRET_KEY;

if (jwtSecretValue === undefined || jwtSecretValue.length < 32) {
  throw new Error('JWT_SECRET_KEY is required and must be at least 32 characters long.');
}

export const databaseUrl = databaseUrlValue;
export const jwtSecret = jwtSecretValue;
