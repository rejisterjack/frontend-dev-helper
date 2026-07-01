import reactInternalConfig from "@repo/eslint-config/react-internal";

/**
 * ESLint flat config for the browser extension.
 *
 * Extends the shared `@repo/eslint-config/react-internal` (which composes
 * `js.configs.recommended`, `typescript-eslint/recommended`, React + Hooks,
 * serviceworker + browser globals, and prettier overrides).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...reactInternalConfig,
  {
    ignores: [
      ".output/**",
      ".wxt/**",
      "coverage/**",
      "node_modules/**",
      "test/setup.ts", // chrome mocks — not linted
    ],
  },
];
