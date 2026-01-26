import { resolve } from "path";
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			runtime: "nodejs22.x",
		}),
		files: {
			assets: "../../packages/ui/static",
		},
		alias: {
			// Workspace packages - point to source for hot reloading in apps
			"@layerd/ui": resolve("../../packages/ui/src/lib"),
			"@layerd/tools": resolve("../../packages/tools/src"),
			"@layerd/config": resolve("../../packages/config"),

			// Root
			$root: resolve("../../../"),

			// Apps (plop added)
			$site: resolve("../../apps/site/src"),
			$storybook: resolve("../../apps/storybook/src"),

			// Default $lib for each app/package
			$lib: "./src/lib",
		},
		experimental: {
			remoteFunctions: true,
		},
		prerender: {
			handleMissingId: "ignore",
		},
	},
	compilerOptions: {
		experimental: {
			async: true,
		},
	},
	vitePlugin: {
		inspector: true,
	},
};

export default config;
