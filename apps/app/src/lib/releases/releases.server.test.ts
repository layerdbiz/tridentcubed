// The releases as git knows them (#157, #400), on a small repository made for each test: which version a build is,
// which release first held each commit, and what dev is about to release, with dev taking next by fast-forward or by
// a merge commit.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { readPrereleaseTags, readReleaseState, readTags } from './releases.server';

let repository = '';
const saved = { ...process.env };

function run(...args: string[]) {
	return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function commit(subject: string) {
	run('commit', '--allow-empty', '--quiet', '-m', subject);
	return run('rev-parse', 'HEAD');
}

function tag(version: string, at = 'HEAD') {
	run('tag', '--annotate', `v${version}`, '--message', `v${version}`, at);
}

beforeEach(() => {
	repository = mkdtempSync(join(tmpdir(), 'releases-'));
	run('init', '--quiet', '--initial-branch', 'dev');
	run('config', 'user.name', 'Test');
	run('config', 'user.email', 'test@example.com');
	run('config', 'commit.gpgsign', 'false');
	run('config', 'tag.gpgsign', 'false');
	// The module asks git in the working folder: point it at this repository.
	process.env.GIT_DIR = join(repository, '.git');
	process.env.GIT_WORK_TREE = repository;
});

afterEach(() => {
	process.env = { ...saved };
	rmSync(repository, { recursive: true, force: true });
});

describe('the releases a build knows', () => {
	it('knows none on dev, and says no version, while releases are not made yet', () => {
		commit('✨ feat(app): one (#1)');

		const state = readReleaseState('HEAD', { branch: 'dev', isOn: false });

		expect(state).toMatchObject({ label: '', releases: [] });
		expect(state.planned).toBeUndefined();
	});

	it('counts every push to next as the next prerelease, before any release, and tells it apart once tagged', () => {
		const one = commit('✨ feat(app): one (#1)');
		const first = readReleaseState('HEAD', { branch: 'next' });

		expect(first).toMatchObject({ label: 'v1.0.0-next.1', isNew: true });
		expect(first.versionOf(one)).toBe('1.0.0-next.1');

		tag('1.0.0-next.1');
		expect(readReleaseState('HEAD', { branch: 'next' })).toMatchObject({
			label: 'v1.0.0-next.1',
			isNew: false
		});

		const two = commit('📝 docs(repo): a note');
		const second = readReleaseState('HEAD', { branch: 'next' });

		expect(second).toMatchObject({ label: 'v1.0.0-next.2', isNew: true });
		expect([one, two].map((each) => second.versionOf(each))).toEqual([
			'1.0.0-next.1',
			'1.0.0-next.2'
		]);
		expect(second.releases.map((release) => release.version)).toEqual([
			'1.0.0-next.1',
			'1.0.0-next.2'
		]);
		// dev knows only releases.
		expect(readReleaseState('HEAD', { branch: 'dev', isOn: false }).label).toBe('');
	});

	it("starts next's count again after a release, toward the one after it", () => {
		commit('✨ feat(app): one');
		tag('1.0.0-next.1');
		tag('1.0.0');
		const after = commit('🐛 fix(app): after the release');

		const next = readReleaseState('HEAD', { branch: 'next' });

		expect(readPrereleaseTags().map((each) => each.version)).toEqual(['1.0.0-next.1']);
		expect(next.label).toBe('v1.0.1-next.1');
		expect(next.versionOf(after)).toBe('1.0.1-next.1');
	});

	it('makes v1.0.0 of everything on dev once they are turned on, and calls next a build before it', () => {
		const one = commit('✨ feat(app): one (#1)');
		commit('🐛 fix(app): two');

		const dev = readReleaseState('HEAD', { branch: 'dev', isOn: true });
		const next = readReleaseState('HEAD', { branch: 'next', isOn: true });

		expect(dev.label).toBe('v1.0.0');
		expect(dev.planned?.changes.map((change) => change.text)).toEqual(['One', 'Two']);
		expect(dev.versionOf(one)).toBe('1.0.0');
		expect(dev.releases).toEqual([
			{
				version: '1.0.0',
				url: 'https://github.com/layerdbiz/tridentcubed/releases/tag/v1.0.0',
				date: expect.any(String)
			}
		]);
		expect(next.label).toBe('v1.0.0-next.1');
		expect(next.releases[0]).not.toHaveProperty('date');
	});

	it("dates each release made on dev the moment its tag was made, the one being made now, and next's not at all", () => {
		commit('✨ feat(app): one');
		tag('1.0.0-next.1');
		process.env.GIT_COMMITTER_DATE = '2026-11-30T15:00:00Z';
		tag('1.0.0');
		delete process.env.GIT_COMMITTER_DATE;
		commit('✨ feat(app): two');

		const dev = readReleaseState('HEAD', { branch: 'dev' });
		const next = readReleaseState('HEAD', { branch: 'next' });

		expect(readTags()[0].date).toBe('2026-11-30T15:00:00+00:00');
		expect(dev.releases.map((each) => [each.version, Boolean(each.date)])).toEqual([
			['1.0.0', true],
			['1.1.0', true]
		]);
		expect(dev.releases[0].date).toBe('2026-11-30T15:00:00+00:00');
		expect(next.releases.map((each) => [each.version, Boolean(each.date)])).toEqual([
			['1.0.0-next.1', false],
			['1.0.0', true],
			['1.1.0-next.1', false]
		]);
	});

	it('reads each tag as the release that first held its commits, and plans the next one', () => {
		const one = commit('✨ feat(app): one (#1)');
		tag('1.0.0');
		const two = commit('🐛 fix(app): two');
		tag('1.0.1');
		const three = commit('✨ feat(ui): three');

		const dev = readReleaseState('HEAD', { branch: 'dev' });
		const next = readReleaseState('HEAD', { branch: 'next' });

		expect(readTags().map((each) => each.version)).toEqual(['1.0.0', '1.0.1']);
		expect(dev.last?.version).toBe('1.0.1');
		expect(dev.label).toBe('v1.1.0');
		expect([one, two, three].map((each) => dev.versionOf(each))).toEqual([
			'1.0.0',
			'1.0.1',
			'1.1.0'
		]);
		expect(next.label).toBe('v1.1.0-next.1');
		expect(next.versionOf(three)).toBe('1.1.0-next.1');
	});

	it("keeps next's commits in the prereleases that brought them after a release holds them; dev names the release", () => {
		const one = commit('✨ feat(app): one');
		tag('1.0.0-next.1');
		const two = commit('🐛 fix(app): two');
		tag('1.0.0-next.2');
		tag('1.0.0');
		const three = commit('✨ feat(app): three');

		const next = readReleaseState('HEAD', { branch: 'next' });
		const dev = readReleaseState('HEAD', { branch: 'dev' });

		expect([one, two, three].map((each) => next.versionOf(each))).toEqual([
			'1.0.0-next.1',
			'1.0.0-next.2',
			'1.1.0-next.1'
		]);
		expect([one, two].map((each) => dev.versionOf(each))).toEqual(['1.0.0', '1.0.0']);
		expect(dev.releases.map((each) => each.version)).toEqual(['1.0.0', '1.1.0']);
	});

	it('is the last release itself when nothing since is a feature or a fix', () => {
		commit('✨ feat(app): one');
		tag('1.0.0');
		commit('📝 docs(repo): a note');

		expect(readReleaseState('HEAD', { branch: 'dev' }).label).toBe('v1.0.0');
	});

	it('sorts tags as versions, so 1.10.0 is newer than 1.9.0', () => {
		commit('✨ feat(app): one');
		tag('1.9.0');
		commit('✨ feat(app): two');
		tag('1.10.0');

		expect(readTags().map((each) => each.version)).toEqual(['1.9.0', '1.10.0']);
		expect(readReleaseState('HEAD', { branch: 'dev' }).label).toBe('v1.10.0');
	});

	it('counts a release dev made with a merge commit as held by next, which holds all it brought', () => {
		commit('✨ feat(app): one');
		tag('1.0.0');
		run('checkout', '--quiet', '-b', 'next');
		const brought = commit('✨ feat(app): brought from next');
		run('checkout', '--quiet', 'dev');
		run('merge', '--no-ff', '--quiet', '-m', 'Merge next into dev', 'next');
		tag('1.1.0');
		run('checkout', '--quiet', 'next');
		commit('🐛 fix(app): after the release');

		const next = readReleaseState('HEAD', { branch: 'next' });

		expect(next.last?.version).toBe('1.1.0');
		expect(next.versionOf(brought)).toBe('1.1.0');
		expect(next.label).toBe('v1.1.1-next.1');
	});

	it('does not count a release main has not been given yet', () => {
		commit('✨ feat(app): one');
		tag('1.0.0');
		run('branch', 'main');
		commit('✨ feat(app): two');
		tag('1.1.0');
		run('checkout', '--quiet', 'main');

		expect(readReleaseState('HEAD', { branch: 'main' }).label).toBe('v1.0.0');
	});
});
