import { createApiClient } from '@golf/shared';

export const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');
