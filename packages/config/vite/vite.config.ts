import { resolve } from 'node:path';
import adapter from '@sveltejs/adapter-vercel';
import { type Config, sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig, lazyPlugins, type ViteUserConfig } from 'vite-plus';

// Every path derives from this file's location or from the app root passed in, never from
// process.cwd(): the shared svelte.config.js of the first attempt resolved
// `../../packages/ui/src/lib` against the working directory, which differs between the repo
// root, an app folder and Vercel (#22, #101).
const PACKAGES_DIR = resolve(import.meta.dirname, '..', '..');
const REPO_ROOT = resolve(PACKAGES_DIR, '..');
const UI_LIB = resolve(PACKAGES_DIR, 'ui', 'src', 'lib');
const UI_STATIC = resolve(PACKAGES_DIR, 'ui', 'static');

export type AppConfigOptions = {
	/** The app directory: `import.meta.dirname` of the app's `vite.config.ts`. */
	root: string;
	/** Merged over the shared prerender settings (`handleMissingId: 'ignore'`). */
	prerender?: Config['prerender'];
	/** Vitest settings, for the apps that have tests. */
	test?: ViteUserConfig['test'];
};

/**
 * The one Vite config for the SvelteKit apps (app, site, play, report). SvelteKit 3 reads only
 * `vite.config.ts`, so an app's file is this call plus its overrides.
 */
export function createAppConfig({ root, prerender, test }: AppConfigOptions) {
	return defineConfig({
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
				prerender: { handleMissingId: 'ignore', ...prerender }
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
		...(test ? { test } : {})
	});
}
