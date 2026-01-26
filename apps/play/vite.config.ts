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
		sveltekit(),
		devtoolsJson(),
	],
	server: {
		fs: {
			// Allow serving files from the monorepo root
			allow: [".."],
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
