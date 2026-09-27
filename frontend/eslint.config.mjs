import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * Next 16 ships real flat configs, so they are imported directly.
 *
 * Next 15 did not, and this file went through `FlatCompat` from
 * @eslint/eslintrc to translate the old format. That shim breaks against
 * Next 16 — its config contains a circular reference the eslintrc
 * validator cannot serialise, and lint dies with a stack trace rather than
 * a lint error.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  { ignores: [".next/**", "next-env.d.ts"] },
  {
    /**
     * server.js is CommonJS on purpose and has to stay that way.
     *
     * It exists because a hosting panel's Node application manager is given
     * one file to run rather than a command, and it runs that file the way
     * Node runs an ordinary .js — as CommonJS. `import` there fails at
     * startup, which on a panel means a blank page and no error anybody
     * sees. So the rule is lifted for this file rather than the file
     * rewritten to satisfy it.
     */
    files: ["server.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default eslintConfig;
