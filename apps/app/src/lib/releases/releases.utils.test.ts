// The release rule (#157) with plain commit subjects, the way `git log` gives them: which commits a release lists,
// as new features or fixes, and which version it gets.
import { describe, expect, it } from 'vite-plus/test';
import { FIRST_SUMMARY, planRelease, toAppChanges, toReleaseNotes } from './releases.utils';

describe('the release rule', () => {
	it('lists a feature and a fix in plain words, with the ticket taken off the end', () => {
		const release = planRelease('1.0.0', [
			{ subject: '✨ feat(app): count an attached PDF as the Items panel’s item list (#290)' },
			{ subject: '🐛 fix(app): photo sliders show every photo and always light a dot (#253)' }
		]);

		expect(release?.changes).toEqual([
			{
				kind: 'feature',
				text: 'Count an attached PDF as the Items panel’s item list',
				area: 'app',
				tickets: [290]
			},
			{
				kind: 'fix',
				text: 'Photo sliders show every photo and always light a dot',
				area: 'app',
				tickets: [253]
			}
		]);
	});

	it('leaves out the work the team never sees: chores, builds, docs, tests, refactors and merges', () => {
		const release = planRelease('1.0.0', [
			{ subject: '🔧 chore(app): undo speed test entry 3 (#270)' },
			{ subject: '👷 ci(repo): start checks when a branch is pushed (#272)' },
			{ subject: '📝 docs(app): decide the V1 pages and how they connect (#160)' },
			{ subject: '♻️ refactor(ui): move the menu list into the library (#313)' },
			{ subject: 'Merge pull request #174 from layerdbiz/claude/project-thread-2liu0v' },
			{ subject: '⚡ perf(app): taps, swipes and preview drags no longer freeze the screen (#252)' }
		]);

		expect(release?.changes.map((change) => change.text)).toEqual([
			'Taps, swipes and preview drags no longer freeze the screen'
		]);
	});

	it('makes no release when nothing since the last one is a feature or a fix', () => {
		expect(planRelease('1.2.3', [{ subject: '🔧 chore(repo): tidy the scripts' }])).toBeUndefined();
	});

	it.each([
		['a fix', ['🐛 fix(app): the time log prints in reports again (#224)'], '1.2.4'],
		['a feature', ['🐛 fix(app): a fix', '✨ feat(app): a feature'], '1.3.0'],
		['a breaking change', ['✨ feat(app)!: a new sign-in', '🐛 fix(app): a fix'], '2.0.0']
	])('moves 1.2.3 on for %s', (_, subjects, version) => {
		const release = planRelease(
			'1.2.3',
			subjects.map((subject) => ({ subject }))
		);

		expect(release?.version).toBe(version);
	});

	it('reads a breaking change from the commit body too', () => {
		const release = planRelease('1.2.3', [
			{
				subject: '🐛 fix(app): sign in again after the change',
				body: 'BREAKING CHANGE: every session ends.'
			}
		]);

		expect(release?.version).toBe('2.0.0');
	});

	it('lists features first, and a title met twice once', () => {
		const release = planRelease('1.0.0', [
			{ subject: '🐛 fix(app): stop the update note coming back (#211)' },
			{ subject: '✨ feat(app): install the app on phones' },
			{ subject: '🐛 fix(app): stop the update note coming back (#211)' }
		]);

		expect(release?.changes.map((change) => change.kind)).toEqual(['feature', 'fix']);
	});

	it('names no area when the title has none, and every ticket it names', () => {
		const release = planRelease('1.0.0', [
			{ subject: 'fix: legal pages list the Mexico number (#177) (#175)' }
		]);

		expect(release?.changes).toEqual([
			{ kind: 'fix', text: 'Legal pages list the Mexico number', tickets: [177, 175] }
		]);
	});

	it('takes several tickets in one bracket off the end too', () => {
		const release = planRelease('1.0.0', [
			{ subject: '🐛 fix(app): show a thing pinned on two devices once (#346, #345)' }
		]);

		expect(release?.changes[0]).toMatchObject({
			text: 'Show a thing pinned on two devices once',
			tickets: [346, 345]
		});
	});

	it('makes the first release v1.0.0 with its welcome line, even with nothing to list', () => {
		const release = planRelease(undefined, [], '2026-11-26');

		expect(release).toEqual({
			version: '1.0.0',
			date: '2026-11-26',
			summary: FIRST_SUMMARY,
			changes: []
		});
	});
});

describe('the release notes on GitHub', () => {
	it('puts the summary first, then the new features and the fixes, each with its tickets', () => {
		const notes = toReleaseNotes({
			version: '1.1.0',
			date: '2026-11-26',
			summary: 'A short word first.',
			changes: [
				{ kind: 'feature', text: 'Install the app on phones', area: 'app', tickets: [206] },
				{
					kind: 'fix',
					text: 'The time log prints in reports again',
					area: 'app',
					tickets: [224, 225]
				}
			]
		});

		expect(notes).toBe(
			[
				'A short word first.',
				'',
				'## ✨ New features',
				'',
				'- Install the app on phones (#206)',
				'',
				'## 🐛 Fixes',
				'',
				'- The time log prints in reports again (#224, #225)',
				''
			].join('\n')
		);
	});

	it('leaves out a heading with nothing under it', () => {
		const notes = toReleaseNotes({
			version: '1.0.1',
			date: '2026-11-26',
			changes: [{ kind: 'fix', text: 'A fix', tickets: [] }]
		});

		expect(notes).toBe(['## 🐛 Fixes', '', '- A fix', ''].join('\n'));
	});
});

describe("the changes What's New lists", () => {
	it('keeps the app and the library, and leaves out the website and the tools', () => {
		const changes = toAppChanges({
			version: '1.1.0',
			date: '2026-11-26',
			changes: [
				{ kind: 'feature', text: 'In the app', area: 'app', tickets: [] },
				{ kind: 'feature', text: 'On the website', area: 'site', tickets: [] },
				{ kind: 'fix', text: 'In the library', area: 'ui', tickets: [] },
				{ kind: 'fix', text: 'Named nowhere', tickets: [] },
				{ kind: 'fix', text: 'In the prototypes', area: 'play', tickets: [] }
			]
		});

		expect(changes.map((change) => change.text)).toEqual([
			'In the app',
			'In the library',
			'Named nowhere'
		]);
	});
});
