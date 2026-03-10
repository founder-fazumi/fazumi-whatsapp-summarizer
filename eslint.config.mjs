import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Next 16's flat config enables stricter React hook purity rules than this repo
      // was previously linting against. Keep the security upgrade scoped to the
      // dependency/tooling alignment instead of forcing unrelated component rewrites.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    // Archived WA bot — CommonJS, linted separately
    "services/**",
  ]),
]);

export default eslintConfig;
