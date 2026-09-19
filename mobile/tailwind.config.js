/**
 * The same brand palette the web app uses (frontend/src/app/globals.css),
 * restated here because NativeWind v4 needs a Tailwind v3 config object and
 * cannot read the web's CSS-first @theme block.
 *
 * Keep the two in step: a colour changed here must be changed there too.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // The app commits to one light palette. Left at the default ("media"),
  // NativeWind warns that it cannot set the colour scheme manually.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#17140f", soft: "#4b443a" },
        gold: { DEFAULT: "#9a7622", bright: "#b58e32", wash: "#f7f0de" },
        ground: "#faf8f5",
        surface: "#ffffff",
        rule: "#e4ddd0",
        success: { DEFAULT: "#2e6042", wash: "#e9f1eb" },
        danger: { DEFAULT: "#8e2f1f", wash: "#fdecea" },
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};
