import { config as reactInternalConfig } from "@repo/eslint-config/react-internal";

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
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // Phase 1.1 of the ext audit: block the XSS-prone DOM sinks at the
      // lint layer. The audit found 7 `innerHTML =` assignments across the
      // codebase; all 7 were reviewed and confirmed safe (static templates
      // or escaped user input), but future drift can reintroduce a taint
      // flow. Each legitimate use site must opt in via a per-line
      // eslint-disable-next-line comment with a justification.
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message:
            "Direct .innerHTML assignment is forbidden — use textContent, createElement, or document.createElement + an explicit escape. If this site is genuinely safe (static template or already-escaped input), add an eslint-disable-next-line with a justification.",
        },
      ],
      "react/no-danger": "error",
    },
  },
];
