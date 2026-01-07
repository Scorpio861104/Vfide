import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "path";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../app/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-viewport",
    "@storybook/addon-webpack5-compiler-swc",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (webpackConfig) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      "@": path.resolve(__dirname, ".."),
      "next/link": path.resolve(__dirname, "mocks/next/link.tsx"),
      "next/navigation": path.resolve(__dirname, "mocks/next/navigation.ts"),
      "next/image": path.resolve(__dirname, "mocks/next/image.tsx"),
      "next/router": path.resolve(__dirname, "mocks/next/router.ts"),
      "next/font/google": path.resolve(__dirname, "mocks/next/font/google.ts"),
    };

    return webpackConfig;
  },
};
export default config;
