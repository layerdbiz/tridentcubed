import { existsSync, globSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAppConfig } from '@layerd/config-vite';
import { svelteTesting } from '@testing-library/svelte/vite';

const root = import.meta.dirname;

// A test beside a component (`place-field.test.ts` beside `place-field.svelte`) draws it, so it runs Svelte's browser
// code in jsdom; every other test runs in Node (#298). Written as patterns, with the glob characters in a route's
// folder name, `(app)`, taken literally.
const COMPONENT_TESTS = globSync('src/**/*.svelte', { cwd: root })
	.map((file) => file.replaceAll('\\', '/').replace(/\.svelte$/, '.test.ts'))
	.filter((file) => existsSync(resolve(root, file)))
	.map((file) => file.replace(/[()[\]{}*?!+@]/g, '\\$&'));

export default createAppConfig({
	root,
	// The service worker shows the Needs Internet screen at whatever address was asked for (#201), so its links to
	// the app's styles start at the root, not beside the page.
	paths: { relative: false },
	// Tests boot an in-process Postgres (PGlite); its first start in each file
	// takes several seconds on a busy CI runner, past Vitest's 5 s default.
	test: {
		testTimeout: 30_000,
		hookTimeout: 30_000,
		projects: [
			{
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: COMPONENT_TESTS
				}
			},
			{
				extends: true,
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					include: COMPONENT_TESTS,
					setupFiles: ['./src/test-setup.ts']
				}
			}
		]
	}
});
