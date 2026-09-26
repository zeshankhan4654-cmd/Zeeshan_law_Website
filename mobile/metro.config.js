// The mobile app installs its own dependencies rather than joining the npm
// workspaces at the repository root. The two trees pin React Native and Next
// to their own versions and are upgraded on their own schedules, so keeping
// them apart avoids one dictating the other's React. Metro therefore needs
// no monorepo accommodations.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
