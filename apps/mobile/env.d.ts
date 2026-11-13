// Only EXPO_PUBLIC_* vars reach the bundle; babel-preset-expo inlines them at build time.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};
