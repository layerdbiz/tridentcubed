import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// CI used to run `pnpm check` in one job: format and lint, type checks, barrels, then every test, one after
// another, 2 to 3 minutes a pull request. Since #254 the tests run in jobs of their own beside the other checks,
// the app's split over two runners. `pnpm check` stays the one local command, so CI must still run every step of
// it; these tests fail when the two drift apart.
function read(path: string) {
	return readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), 'utf8');
}

const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
const workflow = read('.github/workflows/ci.yml');

/** The commands CI's test jobs run, one for each job. */
const testRuns = [...workflow.matchAll(/^\s*run: (pnpm .* test\b.*)$/gm)].map(([, run]) => run);

/** The packages a command names with `--filter`. */
function filtersOf(command: string) {
	return [...command.matchAll(/--filter[= ](\S+)/g)].map(([, name]) => name);
}

describe('the local gate', () => {
	it('is the checks CI runs in one job, then the tests CI runs in the others', () => {
		expect(scripts.check).toBe('pnpm run check:static && pnpm test');
		expect(workflow).toMatch(/^\s*- run: pnpm run check:static$/m);
	});
});

describe("CI's test jobs", () => {
	it('test every package `pnpm test` does', () => {
		const tested = new Set(testRuns.flatMap(filtersOf));

		expect([...tested].toSorted()).toEqual(filtersOf(scripts.test).toSorted());
	});

	it('run every part of a split test run', () => {
		const parts = testRuns.flatMap((run) => [...run.matchAll(/--shard=(\d+)\/(\d+)/g)]);
		const total = Number(parts[0]?.[2]);

		expect(total).toBeGreaterThan(1);
		expect(parts.map(([, part, of]) => `${part}/${of}`).toSorted()).toEqual(
			Array.from({ length: total }, (_, index) => `${index + 1}/${total}`)
		);
	});
});
