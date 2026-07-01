import nextJsConfig from "@repo/eslint-config/next-js";

/**
 * ESLint flat config for the Next.js web app.
 *
 * Extends the shared `@repo/eslint-config/next-js` (which itself composes
 * `js.configs.recommended`, `typescript-eslint/recommended`, React + Hooks,
 * Next.js core-web-vitals, and prettier overrides).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...nextJsConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "public/**",
      "next-env.d.ts",
      "prisma/migrations/**",
    ],
  },
];
