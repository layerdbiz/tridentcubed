import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { variables } from './env';

// Turborepo hands a build only the settings its task lists (turbo.json, `tasks.build.env`); Vercel's build log
// warns about every project setting left out of it (2026-11-17). Vercel's own names are not settings the project
// sets, and the DEV_ names are never set on a deployment.
const turbo = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../turbo.json', import.meta.url)), 'utf8')
) as { tasks: { build: { env: string[] } } };

describe('the settings a build is handed', () => {
	it('lists every setting a deployment sets for the app', () => {
		const set = Object.keys(variables).filter(
			(name) => !name.startsWith('VERCEL') && !name.startsWith('DEV_')
		);

		expect(turbo.tasks.build.env.toSorted()).toEqual(set.toSorted());
	});
});
