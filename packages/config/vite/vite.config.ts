import { resolve } from 'node:path';
import adapter from '@sveltejs/adapter-vercel';
import { type Config, sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { Features } from 'lightningcss';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig, lazyPlugins, type ViteUserConfig } from 'vite-plus';

// Paths derive from this file's location or the app root passed in, never from process.cwd()
// (packages/tools/README.md, invariant 12).
const PACKAGES_DIR = resolve(import.meta.dirname, '..', '..');
const REPO_ROOT = resolve(PACKAGES_DIR, '..');
const UI_LIB = resolve(PACKAGES_DIR, 'ui', 'src', 'lib');
const UI_STATIC = resolve(PACKAGES_DIR, 'ui', 'static');

export type AppConfigType = {
	/** The app directory: `import.meta.dirname` of the app's `vite.config.ts`. */
	root: string;
	/** Merged over the shared prerender settings (`handleMissingId: 'ignore'`). */
	prerender?: Config['prerender'];
	/** SvelteKit's `paths`, for an app whose pages are served at addresses they were not made for. */
	paths?: Config['paths'];
	/** Vitest settings, for the apps that have tests. */
	test?: ViteUserConfig['test'];
};

/**
 * The one Vite config for the SvelteKit apps (app, site, play, overview). SvelteKit 3 reads only
 * `vite.config.ts`, so an app's file is this call plus its overrides.
 */
export function createAppConfig({ root, prerender, paths, test }: AppConfigType) {
	return defineConfig(({ command }) => ({
		root,
		plugins: lazyPlugins(() => [
			tailwindcss(),
			sveltekit({
				preprocess: vitePreprocess(),
				compilerOptions: { experimental: { async: true } },
				inspector: true,
				adapter: adapter({ runtime: 'nodejs24.x' }),
				// Every app serves packages/ui/static at the same URLs (invariant 9)
				files: { assets: UI_STATIC },
				experimental: { remoteFunctions: true },
				prerender: { handleMissingId: 'ignore', ...prerender },
				paths,
				// SvelteKit 3 registers an app's service worker (`src/service-worker`) from the dev server as well,
				// where it would keep and answer files that change under it. A build only.
				serviceWorker: { register: command === 'build' }
			}),
			devtoolsJson()
		]),
		server: {
			fs: {
				// Allow serving workspace package sources like packages/ui during dev
				allow: [REPO_ROOT]
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
				// Apps consume UI source (invariant 6). Covers @layerd/ui/ui.css too, so Tailwind
				// sees the source @theme.
				'@layerd/ui': UI_LIB
			}
		},
		css: {
			// Each app's PostCSS turns `light-dark()` into a stand-in for browsers without it and keeps the real one
			// for the rest. Left alone, the minifier would rewrite the kept one into a second stand-in that cannot
			// follow a section with its own colour scheme (the site's dark footer), so it is told to leave it be.
			lightningcss: { exclude: Features.LightDark }
		},
		test
	}));
}
