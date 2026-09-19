// The mobile app installs its own dependencies rather than joining the npm
// workspaces at the repository root: React Native 0.76 requires React 18.3.1
// while the Next.js web app requires React 19, so the two cannot share a
// dependency tree. Metro therefore needs no monorepo accommodations.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
