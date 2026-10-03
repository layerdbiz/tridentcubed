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
			experimental: { remoteFunctions: true },
			prerender: {
				handleMissingId: "ignore",
				handleHttpError: ({ path, referrer, message }) => {
					// Handle remote function errors during prerender gracefully
					// These can fail when external APIs are unreachable during build
					if (path.includes("/_app/remote/")) {
						console.warn(`⚠️ Prerender warning: Remote function failed at ${path}`);
						console.warn(`   Referrer: ${referrer}`);
						console.warn(`   Message: ${message}`);
						console.warn(`   This is expected if external APIs are unreachable during build.`);

						return; /* Don't fail the build */
					}

					// For other HTTP errors, fail the build
					throw new Error(message);
				},

				// Handle routes that weren't crawled (like catch-all 404 routes)
				handleUnseenRoutes: "ignore"
			}
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
			// Workspace packages - point to source for hot reloading in apps.
			// Covers @layerd/ui/ui.css too, so Tailwind sees the source @theme.
			"@layerd/ui": path.resolve(__dirname, "../../packages/ui/src/lib"),
		},
	},
});
