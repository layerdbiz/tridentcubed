import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

// NOTE: Using @tailwindcss/postcss (via postcss.config.js) instead of @tailwindcss/vite
// to avoid conflicts - only one Tailwind processor should be active

export default defineConfig({
	plugins: [
		sveltekit(),
		devtoolsJson(),
	],
});
