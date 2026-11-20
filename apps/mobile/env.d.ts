// Expo inlines public environment variables and the EXPO_OS platform constant.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_OS: 'ios' | 'android' | 'web';
    EXPO_PUBLIC_API_URL?: string;
  }
}
