import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// Two Vercel projects read this folder's `vercel.json`: the dev one, whose live branch is `dev`, and the
// production one, whose live branch is `main`. Vercel calls a build of a project's live branch "production" and
// every other build "preview". Until #254 the rule named branches, so each push to `dev` also built a preview in
// the production project that nobody opens, four builds where two were needed.
const { ignoreCommand } = JSON.parse(
	readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8')
) as { ignoreCommand: string };

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

	it('builds a preview of a feature branch, so a run that stays off dev still has a link to open', () => {
		expect(
			isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/280-november-feedback' })
		).toBe(true);
	});

	it('skips a branch whose name only contains feature', () => {
		expect(isBuilt({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'fix/1-feature/x' })).toBe(
			false
		);
	});

	it('builds when Vercel does not say which kind of build it is, so a live site never stops updating', () => {
		expect(isBuilt({ VERCEL_GIT_COMMIT_REF: 'dev' })).toBe(true);
	});
});
