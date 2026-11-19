export type HealthResponse = {
  status: 'ok';
  time: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { username: string; fullName: string };
export type LoginResult = { accessToken: string; user: AuthUser };
export type Direction = 'left' | 'straight' | 'right';
export type FlightHeight = 'low' | 'normal' | 'high';
export type Shot = { start: Direction; curve: Direction; height: FlightHeight };
export type Drill = { id: string; title: string; instruction: string };
export type DrillMatch = {
  ruleId: string;
  shot: Shot;
  feedback: string;
  drill: Drill;
};
export type Completion = {
  id: string;
  ruleId: string;
  completedAt: string;
  match: DrillMatch;
};
export type CompletionInput = { id: string; ruleId: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiClient = {
  health: () => Promise<HealthResponse>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  login: (input: LoginInput) => Promise<LoginResult>;
  me: (token: string) => Promise<AuthUser>;
  matchShot: (token: string, shot: Shot, signal?: AbortSignal) => Promise<DrillMatch | null>;
  completePractice: (
    token: string,
    input: CompletionInput,
    signal?: AbortSignal,
  ) => Promise<Completion>;
  listCompletions: (token: string, signal?: AbortSignal) => Promise<Completion[]>;
};

type RequestOptions = {
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
};

export function createApiClient(baseUrl: string): ApiClient {
  const url = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${url}${path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        body !== null &&
        typeof body === 'object' &&
        'message' in body &&
        typeof body.message === 'string'
          ? body.message
          : `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }

    return response.json() as Promise<T>;
  }

  return {
    health: () => request<HealthResponse>('/health'),
    async register(input) {
      const result = await request<{ user: AuthUser }>('/auth/register', { body: input });
      return result.user;
    },
    async login(input) {
      const result = await request<LoginResult>('/auth/login', { body: input });
      return { accessToken: result.accessToken, user: result.user };
    },
    async me(token) {
      const result = await request<{ user: AuthUser }>('/auth/me', { token });
      return result.user;
    },
    async matchShot(token, shot, signal) {
      const result = await request<{ match: DrillMatch | null }>('/practice/match', {
        token,
        body: shot,
        signal,
      });
      return result.match;
    },
    async completePractice(token, input, signal) {
      const result = await request<{ completion: Completion }>('/practice/completions', {
        token,
        body: input,
        signal,
      });
      return result.completion;
    },
    async listCompletions(token, signal) {
      const result = await request<{ completions: Completion[] }>('/practice/completions', {
        token,
        signal,
      });
      return result.completions;
    },
  };
}
