// Browser sessions deliberately do not survive a reload or leave this tab's memory.
let accessToken: string | null = null;

export async function getToken(): Promise<string | null> {
  return accessToken;
}

export async function setToken(token: string): Promise<void> {
  accessToken = token;
}

export async function removeToken(): Promise<void> {
  accessToken = null;
}
