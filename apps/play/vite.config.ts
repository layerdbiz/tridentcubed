import { resolve } from "path";
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import devtoolsJson from "vite-plugin-devtools-json";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			inspector: true,
			adapter: adapter({ runtime: "nodejs24.x" }),
			files: { assets: "../../packages/ui/static" },
			alias: {
				// Workspace packages - point to source for hot reloading in apps
				"@layerd/ui": resolve("../../packages/ui/src/lib"),
				"@layerd/ui/base": resolve("../../packages/ui/src/lib/base"),
				"@layerd/ui/base/helpers": resolve("../../packages/ui/src/lib/base/helpers"),
				"@layerd/ui/helpers": resolve("../../packages/ui/src/lib/base/helpers"),
				"@layerd/ui/utils": resolve("../../packages/ui/src/lib/utils"),
				"@layerd/ui/components": resolve("../../packages/ui/src/lib/components"),
				"@layerd/tools": resolve("../../packages/tools/src"),
				"@layerd/config": resolve("../../packages/config"),
				// Root
				$root: resolve("../../../"),

				// Apps (plop added)
				$site: resolve("../../apps/site/src"),
				$storybook: resolve("../../apps/storybook/src")
			},
			experimental: { remoteFunctions: true },
			prerender: { handleMissingId: "ignore" }
		}),
		devtoolsJson()
	],
	server: {
		fs: {
			// Allow serving workspace package sources like packages/ui during dev
			allow: [path.resolve(__dirname, "../..")],
		},
		watch: {
			// Better symlink handling
			followSymlinks: true,
			// Ignore common problematic patterns
			ignored: ["**/node_modules/**", "**/.git/**"],
		},
	},
	resolve: {
		// Preserve symlinks for better HMR
		preserveSymlinks: false,
		alias: {
			// Force using the built CSS with PostCSS transformations during development
			"@layerd/ui/ui.css": path.resolve(
				__dirname,
				"../../packages/ui/dist/ui.css",
			),
		},
	},
});
