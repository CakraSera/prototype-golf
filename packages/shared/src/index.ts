export type HealthResponse = {
  status: 'ok';
  time: string;
};

export type ApiClient = {
  health: () => Promise<HealthResponse>;
};

export function createApiClient(baseUrl: string): ApiClient {
  const url = baseUrl.replace(/\/+$/, '');

  return {
    async health() {
      const response = await fetch(`${url}/health`);
      if (!response.ok) {
        throw new Error(`GET /health failed: ${response.status}`);
      }
      return (await response.json()) as HealthResponse;
    },
  };
}
