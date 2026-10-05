import { createAppConfig } from '@layerd/config-vite';

export default createAppConfig({
	root: import.meta.dirname,
	test: { include: ['src/**/*.test.ts'] }
});
