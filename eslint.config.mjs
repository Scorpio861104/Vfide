import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";
import securityPlugin from "eslint-plugin-security";

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
    "artifacts/**",
    "websocket-server/dist/**",
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
    plugins: {
      react: reactPlugin,
      security: securityPlugin,
    },
    rules: {
      // Security plugin rules (warn to avoid blocking existing code)
      "security/detect-object-injection": "off", // Too noisy for bracket notation
      "security/detect-non-literal-regexp": "off",
      "security/detect-unsafe-regex": "off",
      "security/detect-buffer-noassert": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "warn",
      "security/detect-possible-timing-attacks": "warn",
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
      // Warn on dangerouslySetInnerHTML to ensure all uses are reviewed.
      // Safe uses (hardcoded JSON-LD schemas in StructuredData.tsx) are the only
      // intentional exceptions — do not suppress this warning without a code review.
      "react/no-danger": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "lib/crypto.ts",
      "lib/cryptoApprovals.ts",
      "lib/cryptoConfirmations.ts",
      "lib/cryptoValidation.ts",
      "lib/services/gasPriceService.ts",
      "hooks/useGasPrice.ts",
      "lib/ethereumProvider.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.type='MemberExpression'][callee.property.name='request'][callee.object.type='MemberExpression'][callee.object.object.name='window'][callee.object.property.name='ethereum']",
          "message": "Use the typed requestEthereum() helper instead of calling window.ethereum.request() directly.",
        },
        {
          "selector": "CallExpression[callee.type='MemberExpression'][callee.property.name='request'][callee.object.name='ethereum']",
          "message": "Use the typed requestEthereum() helper instead of calling ethereum.request() directly.",
        }
      ],
    },
  },
]);

export default eslintConfig;
