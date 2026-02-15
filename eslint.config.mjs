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
    "typechain-types/**",

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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true,
      }],
      // Allow <img> for dynamic/external images where Next.js Image optimization isn't suitable
      "@next/next/no-img-element": "warn",
      // Allow anonymous default exports for config files
      "import/no-anonymous-default-export": "off",
    },
  },

  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
