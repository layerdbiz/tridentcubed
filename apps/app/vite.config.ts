import { createAppConfig } from '@layerd/config-vite';

export default createAppConfig({
	root: import.meta.dirname,
	// The service worker shows the Needs Internet screen at whatever address was asked for (#201), so its links to
	// the app's styles start at the root, not beside the page.
	paths: { relative: false },
	// Tests boot an in-process Postgres (PGlite); its first start in each file
	// takes several seconds on a busy CI runner, past Vitest's 5 s default.
	test: { include: ['src/**/*.test.ts'], testTimeout: 30_000, hookTimeout: 30_000 }
});
