const { colors } = require('./theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  // The app is light-only and defines no `dark:` variants. NativeWind's web
  // runtime throws on dev startup when darkMode is `media`, because its
  // MutationObserver calls colorScheme.set() once the injected stylesheet
  // arrives. `class` keeps that path legal and avoids prefers-color-scheme
  // flipping any styles.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Warm cream backgrounds/surfaces, deep green for content.
        background: colors.background,
        surface: colors.surface,
        foreground: colors.foreground,
        'surface-foreground': colors.foreground,
        // Golden yellow is reserved for primary actions and highlights.
        primary: colors.primary,
        'primary-foreground': colors.foreground,
        secondary: colors.secondary,
        'secondary-foreground': colors.background,
        // Deep green tinted for quiet separation and secondary copy.
        border: colors.border,
        'muted-foreground': colors.mutedForeground,
        // Preserved functional status colors (paired with text/icon).
        success: colors.success,
        danger: colors.danger,
      },
    },
  },
  plugins: [],
};
