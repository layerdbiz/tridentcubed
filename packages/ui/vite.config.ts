import { resolve } from 'path';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, lazyPlugins } from 'vite-plus';
import devtoolsJson from 'vite-plugin-devtools-json';
import { svelteTesting } from '@testing-library/svelte/vite';

// NOTE: Using @tailwindcss/postcss (via postcss.config.js) instead of @tailwindcss/vite
// to avoid conflicts - only one Tailwind processor should be active

export default defineConfig({
	plugins: lazyPlugins(() => [
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			inspector: true,
			adapter: adapter({ runtime: 'nodejs24.x' }),
			// `kit.alias` is deprecated in Kit 3 (svelte-check prints
			// config_option_deprecated_alias on every run), but it stays until
			// "UI library cleanup" (#33): svelte-package 2.5.8 rewrites only
			// `kit.alias` into relative paths in dist, so the `@layerd/ui`
			// self-imports under src/lib cannot move to `package.json#imports`
			// the way the apps did on #83 without breaking the built package.
			alias: {
				'@layerd/ui': resolve('./src/lib'),
				'@layerd/ui/base': resolve('./src/lib/base'),
				'@layerd/ui/base/helpers': resolve('./src/lib/base/helpers'),
				'@layerd/ui/helpers': resolve('./src/lib/base/helpers'),
				'@layerd/ui/utils': resolve('./src/lib/utils'),
				'@layerd/ui/components': resolve('./src/lib/components'),
				'@layerd/ui/ui.css': resolve('./src/lib/ui.css')
			}
		}),
		devtoolsJson(),
		svelteTesting()
	]),
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['./src/test-setup.ts']
	}
});
