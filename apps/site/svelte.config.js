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
			handleHttpError: ({ path, referrer, message }) => {
				// Handle remote function errors during prerender gracefully
				// These can fail when external APIs are unreachable during build
				if (path.includes("/_app/remote/")) {
					console.warn(
						`⚠️ Prerender warning: Remote function failed at ${path}`,
					);
					console.warn(`   Referrer: ${referrer}`);
					console.warn(`   Message: ${message}`);
					console.warn(
						`   This is expected if external APIs are unreachable during build.`,
					);
					return; // Don't fail the build
				}
				// For other HTTP errors, fail the build
				throw new Error(message);
			},
			// Handle routes that weren't crawled (like catch-all 404 routes)
			handleUnseenRoutes: "ignore",
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
