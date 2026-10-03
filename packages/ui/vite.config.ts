import { resolve } from "path";
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

// NOTE: Using @tailwindcss/postcss (via postcss.config.js) instead of @tailwindcss/vite
// to avoid conflicts - only one Tailwind processor should be active

export default defineConfig({
	plugins: [
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			inspector: true,
			adapter: adapter({ runtime: "nodejs24.x" }),
			alias: {
				"@layerd/ui": resolve("./src/lib"),
				"@layerd/ui/base": resolve("./src/lib/base"),
				"@layerd/ui/base/helpers": resolve("./src/lib/base/helpers"),
				"@layerd/ui/helpers": resolve("./src/lib/base/helpers"),
				"@layerd/ui/utils": resolve("./src/lib/utils"),
				"@layerd/ui/components": resolve("./src/lib/components"),
				"@layerd/ui/ui.css": resolve("./src/lib/ui.css")
			}
		}),
		devtoolsJson()
	]
});
