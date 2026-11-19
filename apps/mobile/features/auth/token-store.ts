import * as SecureStore from 'expo-secure-store';

const tokenKey = 'dial-golf.access-token';

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(tokenKey);
}

export function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(tokenKey, token);
}

export function removeToken(): Promise<void> {
  return SecureStore.deleteItemAsync(tokenKey);
}
