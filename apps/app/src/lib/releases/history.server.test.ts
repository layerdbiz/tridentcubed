// What's New's history as a build reads it from git (#157, Justin, 2026-11-28), on a small repository made for each
// test: a release on dev told in its highlights, next.app showing the release to come on top, and a build of dev that
// stops rather than make a release without its highlights.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { HighlightsType } from './highlights';
import { MissingHighlightsError, readHistoryOf } from './history.server';

let repository = '';
const saved = { ...process.env };

function run(...args: string[]) {
	return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function commit(subject: string, words: string) {
	run('commit', '--allow-empty', '--quiet', '-m', subject, '-m', `What's New: ${words}`);
}

function tag(version: string) {
	run('tag', '--annotate', `v${version}`, '--message', `v${version}`);
}

const HIGHLIGHTS: Record<string, HighlightsType> = {
	'1.0.0': { features: [{ title: 'Sign in', points: ['With Google.'] }], fixes: [] },
	'1.1.0': { features: [{ title: 'Search', points: ['From the menu.'] }], fixes: [] }
};

beforeEach(() => {
	repository = mkdtempSync(join(tmpdir(), 'history-'));
	run('init', '--quiet', '--initial-branch', 'dev');
	run('config', 'user.name', 'Test');
	run('config', 'user.email', 'test@example.com');
	run('config', 'commit.gpgsign', 'false');
	run('config', 'tag.gpgsign', 'false');
	// The module asks git in the working folder: point it at this repository.
	process.env.GIT_DIR = join(repository, '.git');
	process.env.GIT_WORK_TREE = repository;
	commit('✨ feat(app): sign in (#1)', 'Sign in with Google.');
	tag('1.0.0');
	commit('✨ feat(app): search (#2)', 'Search from the menu.');
});

afterEach(() => {
	process.env = { ...saved };
	rmSync(repository, { recursive: true, force: true });
});

describe("a build's history", () => {
	it('tells a release on dev in its highlights', () => {
		process.env.VERCEL_GIT_COMMIT_REF = 'dev';

		const history = readHistoryOf('HEAD', HIGHLIGHTS);

		expect(history.version).toBe('v1.1.0');
		expect(
			history.batches.map((batch) => [
				batch.release?.version,
				batch.changes.map((change) => [change.text, change.points])
			])
		).toEqual([
			['1.1.0', [['Search', ['From the menu.']]]],
			['1.0.0', [['Sign in', ['With Google.']]]]
		]);
	});

	it('stops a build of dev that would make a release without its highlights', () => {
		process.env.VERCEL_GIT_COMMIT_REF = 'dev';
		commit('✨ feat(app): pins (#3)', 'Pin anything to the menu.');
		tag('1.1.0');
		commit('✨ feat(app): bell (#4)', 'The bell rings.');

		expect(() => readHistoryOf('HEAD', HIGHLIGHTS)).toThrow(MissingHighlightsError);
		expect(() => readHistoryOf('HEAD', HIGHLIGHTS)).toThrow(/v1\.2\.0 has no highlights/);
	});

	it('shows the release to come on top of next.app once its highlights are written', () => {
		process.env.VERCEL_GIT_COMMIT_REF = 'next';

		const history = readHistoryOf('HEAD', HIGHLIGHTS);

		expect(history.version).toBe('v1.1.0-next.1');
		expect(
			history.batches.map((batch) => [
				batch.isUpcoming ?? false,
				batch.release?.version,
				batch.changes.map((change) => change.text)
			])
		).toEqual([
			[true, '1.1.0', ['Search']],
			[false, '1.1.0-next.1', ['Search from the menu.']],
			[false, '1.0.0', ['Sign in']]
		]);
	});

	it('shows next.app its own versions alone while the next highlights are not written', () => {
		process.env.VERCEL_GIT_COMMIT_REF = 'next';

		const history = readHistoryOf('HEAD', { '1.0.0': HIGHLIGHTS['1.0.0'] });

		expect(history.batches.map((batch) => batch.isUpcoming ?? false)).toEqual([false, false]);
	});
});
