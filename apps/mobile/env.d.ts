// Expo inlines public environment variables and the EXPO_OS platform constant.
declare const process: {
  env: {
    EXPO_OS: 'ios' | 'android' | 'web';
    EXPO_PUBLIC_API_URL?: string;
  };
};
