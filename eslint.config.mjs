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
    "public/mockServiceWorker.js",
    
    // Temporarily exclude extremely large files that cause ESLint to hang
    // TODO: Refactor these files into smaller components
    "app/governance/page.tsx",
    "app/admin/page.tsx",
  ]),

  // Make lint actionable for this repo: avoid failing on widespread, intentional patterns.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true,
      }],
      "@next/next/no-page-custom-font": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      // These are intentional patterns - adding deps would cause infinite loops
      "react-hooks/exhaustive-deps": "off",
      // Allow <img> for dynamic/external images where Next.js Image optimization isn't suitable
      "@next/next/no-img-element": "off",
      // Allow anonymous default exports for config files
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
