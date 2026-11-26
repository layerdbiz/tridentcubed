import { BUILD_ENV } from '@layerd/config-vite';
import { describe, expect, it } from 'vite-plus/test';
import { variables } from './env';

// `vp run` hands a task only the settings its cache lists (`BUILD_ENV` in packages/config/vite), so the root
// `pnpm build` would build without one left out. The list began in the monorepo tool before it, whose Vercel builds
// warned about every project setting missing from it (2026-11-17). Vercel's own names are not settings the project
// sets, and the DEV_ names are never set on a deployment.
describe('the settings a build is handed', () => {
	it('lists every setting a deployment sets for the app', () => {
		const set = Object.keys(variables).filter(
			(name) => !name.startsWith('VERCEL') && !name.startsWith('DEV_')
		);

		expect(BUILD_ENV.toSorted()).toEqual(set.toSorted());
	});
});
