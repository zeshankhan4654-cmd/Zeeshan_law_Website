module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    /**
     * Reanimated 4 moved its Babel plugin into react-native-worklets, which
     * is now a separate package. `react-native-reanimated/plugin` still
     * works — it re-exports this one — but it is a shim, and naming the
     * package that actually owns the plugin means an error here points at
     * the right dependency.
     */
    plugins: ["react-native-worklets/plugin"],
  };
};
