import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/sveltekit";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|ts|svelte|svelte.js|svelte.ts)",
  ],
  staticDirs: ["../../../packages/ui/static"],
  addons: [
    getAbsolutePath("@storybook/addon-svelte-csf"),
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-themes"),
  ],
  async viteFinal(config) {
    return mergeConfig(config, {
      optimizeDeps: {
        include: [
          "@storybook/blocks",
          "@mdx-js/react",
        ],
      },
      server: {
        fs: {
          strict: false,
        },
      },
    });
  },
};
export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
