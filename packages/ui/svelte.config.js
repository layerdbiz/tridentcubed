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
		alias: {
			"@layerd/ui": resolve("./src/lib"),
			"@layerd/ui/base": resolve("./src/lib/base"),
			"@layerd/ui/base/helpers": resolve("./src/lib/base/helpers"),
			"@layerd/ui/helpers": resolve("./src/lib/base/helpers"),
			"@layerd/ui/utils": resolve("./src/lib/utils"),
			"@layerd/ui/components": resolve("./src/lib/components"),
			"@layerd/ui/ui.css": resolve("./src/lib/ui.css"),
		},
	},
	vitePlugin: {
		inspector: true,
	},
};

export default config;
