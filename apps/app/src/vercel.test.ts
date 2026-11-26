import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// Two Vercel projects read this folder's `vercel.json`: the dev one, whose live branch is `dev`, and the
// production one, whose live branch is `main`. Vercel calls a build of a project's live branch "production" and
// every other build "preview". Until #254 the rule named branches, so each push to `dev` also built a preview in
// the production project that nobody opens, four builds where two were needed. The dev project also builds
// `next`, the branch for risky and overnight work, as a preview served at next.app.tridentcubed.com (#341).
const { ignoreCommand, buildCommand } = JSON.parse(
	readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8')
) as { ignoreCommand: string; buildCommand?: string };

type PushType = { VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF: string };

/** Whether Vercel builds a push: it runs the rule as a shell command and builds when the command fails. */
function isBuilt(push: PushType) {
	return (
		spawnSync('sh', ['-c', ignoreCommand], { env: { PATH: process.env.PATH, ...push } }).status !==
		0
	);
}

// Windows has no `sh` outside Git Bash; the rule is checked wherever Vercel's own shell exists.
const hasShell = spawnSync('sh', ['-c', 'exit 0']).status === 0;

describe.skipIf(!hasShell)('which pushes Vercel builds', () => {
	it('builds the dev project on a push to dev', () => {
		expect(isBuilt({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'dev' })).toBe(true);
	});

	it('skips the production project on a push to dev', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'dev' })).toBe(false);
	});

	it('builds the production project on a push to main', () => {
		expect(isBuilt({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(true);
	});

	it('skips the dev project on a push to main', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
	});

	it('skips a pull request branch in every project', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feat/1-something' })).toBe(
			false
		);
	});

	it('builds a push to next in the dev project, the quick place for risky work at next.app', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'next' })).toBe(true);
	});

	it('skips a branch whose name only starts with next', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'next-try' })).toBe(false);
	});

	it('builds when Vercel does not say which kind of build it is, so a live site never stops updating', () => {
		expect(isBuilt({ VERCEL_GIT_COMMIT_REF: 'dev' })).toBe(true);
	});
});

// Both projects build with the app's own `pnpm build` (`vp build`), the command CI's build job runs. Left unset,
// Vercel picks a command of its own: the monorepo tool's while the repo had one, which first built the UI package
// nobody reads (#367, research on #364), and its SvelteKit preset's `vite build` now, which CI never runs.
describe('how Vercel builds', () => {
	const { scripts } = JSON.parse(
		readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
	) as { scripts: { build: string } };

	it("runs the app's own build, the one CI checks", () => {
		expect(buildCommand).toBe('pnpm build');
		expect(scripts.build).toBe('vp build');
	});
});

// The adapter packs the server code into Vercel functions, following every import into node_modules for each one
// (Node File Trace). Photo conversion and PDF export each keep a function of their own with five minutes to run:
// sharp and Chromium load only there, and a print or a full-size photo never shares memory with page requests.
// Putting every route in one function would trace once, but would end both (research on #397).
describe('the long jobs keep their own Vercel functions', () => {
	for (const route of ['api/convert', 'api/export/pdf']) {
		it(`gives ${route} a function of its own with five minutes`, () => {
			const source = readFileSync(
				fileURLToPath(new URL(`./routes/${route}/+server.ts`, import.meta.url)),
				'utf8'
			);
			expect(source).toContain('export const config = { maxDuration: 300, split: true };');
		});
	}
});

// Left alone, the adapter starts each function's trace from nothing and reads and parses the same packages four
// times. The patch in `patches/` gives the four traces one cache, which took the step from about 14 s to 7 s with
// the same files in every function (#397). pnpm stops an install when the patch no longer fits a new adapter
// version, but says nothing when the patch setting itself goes missing; this catches that.
describe('the Vercel adapter traces with one shared cache', () => {
	const adapter = readFileSync(
		realpathSync(
			fileURLToPath(
				new URL(
					'../../../packages/config/vite/node_modules/@sveltejs/adapter-vercel/index.js',
					import.meta.url
				)
			)
		),
		'utf8'
	);

	it('hands every trace the same cache', () => {
		expect(adapter).toMatch(/nodeFileTrace\(\[entry\], \{[^}]*cache: nft_cache/);
	});

	it('forgets its own entry files, which it rewrites for every function, before each trace', () => {
		expect(adapter).toMatch(/forget_entry_files\(.*\);\s+const traced = await nodeFileTrace/);
	});
});
