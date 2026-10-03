import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, lazyPlugins } from 'vite-plus';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: lazyPlugins(() => [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			inspector: true,
			adapter: adapter({ runtime: 'nodejs24.x' }),
			files: { assets: '../../packages/ui/static' },
			experimental: { remoteFunctions: true },
			prerender: { handleMissingId: 'ignore' }
		}),
		devtoolsJson()
	]),
	server: {
		fs: {
			// Allow serving workspace package sources like packages/ui during dev
			allow: [path.resolve(__dirname, '../..')]
		},
		watch: {
			// Better symlink handling
			followSymlinks: true,
			// Ignore common problematic patterns
			ignored: ['**/node_modules/**', '**/.git/**']
		}
	},
	resolve: {
		// Preserve symlinks for better HMR
		preserveSymlinks: false,
		alias: {
			// Workspace packages - point to source for hot reloading in apps.
			// Covers @layerd/ui/ui.css too, so Tailwind sees the source @theme.
			'@layerd/ui': path.resolve(__dirname, '../../packages/ui/src/lib')
		}
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
