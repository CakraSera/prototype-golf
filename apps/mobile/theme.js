// Single source for the palette. tailwind.config.js maps these to utilities;
// native APIs (stack headers, symbol tints) read them directly.
const colors = {
  background: '#FFFBF0',
  surface: '#FFFBF0',
  foreground: '#25332B',
  primary: '#F4C542',
  secondary: '#25332B',
  border: 'rgba(37, 51, 43, 0.24)',
  mutedForeground: '#666F66',
  success: '#1A7F37',
  danger: '#B42318',
};

module.exports = { colors };
