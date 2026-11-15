/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Warm cream backgrounds/surfaces, deep green for content.
        background: '#FFFBF0',
        surface: '#FFFBF0',
        foreground: '#25332B',
        'surface-foreground': '#25332B',
        // Golden yellow is reserved for primary actions and highlights.
        primary: '#F4C542',
        'primary-foreground': '#25332B',
        secondary: '#25332B',
        'secondary-foreground': '#FFFBF0',
        // Deep green tinted for quiet separation and secondary copy.
        border: 'rgba(37, 51, 43, 0.24)',
        'muted-foreground': '#666F66',
        // Preserved functional status colors (paired with text/icon).
        success: '#1A7F37',
        danger: '#B42318',
      },
    },
  },
  plugins: [],
};
