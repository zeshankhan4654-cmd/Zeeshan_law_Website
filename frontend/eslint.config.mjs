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
];

export default eslintConfig;
