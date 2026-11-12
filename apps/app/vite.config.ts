import { createAppConfig } from '@layerd/config-vite';

export default createAppConfig({
	root: import.meta.dirname,
	// Tests boot an in-process Postgres (PGlite); its first start in each file
	// takes several seconds on a busy CI runner, past Vitest's 5 s default.
	test: { include: ['src/**/*.test.ts'], testTimeout: 30_000, hookTimeout: 30_000 }
});
