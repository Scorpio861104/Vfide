import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1920px", height: "1080px" },
          type: "desktop",
        },
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#1A1A1D" },
        { name: "vfide-dark", value: "#0f0f12" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ fontFamily: "'Geist', sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
