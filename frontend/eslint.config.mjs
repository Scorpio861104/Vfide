import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Repo docs/artifacts inside frontend/ (not source code):
    "**/*.md",
    "**/*.txt",
    "docs/**",
    "docs-internal/**",
    "coverage/**",
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",

    // Tests/dev-only files shouldn't block production lint:
    "__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.stories.*",
    "**/*.stories.mdx",
    "e2e/**",
    "playwright/**",
  ]),

  // Make lint actionable for this repo: avoid failing on widespread, intentional patterns.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
