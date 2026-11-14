const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Tailwind's spacing scale assumes a 16px rem (4-point grid). NativeWind
// defaults to 14px of RN's default text size, turning gap-2/px-6 into 7/21.
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
