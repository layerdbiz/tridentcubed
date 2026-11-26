// The release rule (#157) with plain commit subjects, the way `git log` gives them: which commits a release lists,
// as new features or fixes, which version it gets, what the app calls its version and what GitHub's notes say.
import { describe, expect, it } from 'vite-plus/test';
import type { HistoryBatchType } from './history.utils';
import {
	FIRST_SUMMARY,
	isAppChange,
	planRelease,
	toBatchTitle,
	toBatchWhen,
	toReleaseNotes,
	toReleaseUrl,
	toTagVersion,
	toVersionLabel,
	type ReleaseChangeType
} from './releases.utils';

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

describe('the version people read', () => {
	it('says nothing while nothing is released and releases are not made yet', () => {
		expect(toVersionLabel({ isReleaseBranch: true, ahead: 40 })).toBe('');
	});

	it('is the last release when nothing new came since', () => {
		expect(toVersionLabel({ last: '1.1.0', isReleaseBranch: false, ahead: 2 })).toBe('v1.1.0');
	});

	it('is the release being made on dev, before its tag exists', () => {
		expect(
			toVersionLabel({ last: '1.1.0', planned: '1.2.0', isReleaseBranch: true, ahead: 3 })
		).toBe('v1.2.0');
	});

	it('is the release still to come on next, with the commits since the last one', () => {
		expect(
			toVersionLabel({ last: '1.1.0', planned: '1.2.0', isReleaseBranch: false, ahead: 12 })
		).toBe('v1.2.0-next.12');
	});

	it('reads only plain release tags, and links each to its notes', () => {
		expect(toTagVersion('v1.10.2')).toBe('1.10.2');
		expect(toTagVersion('v1.2')).toBeUndefined();
		expect(toTagVersion('v1.2.0-rc.1')).toBeUndefined();
		expect(toTagVersion('persist')).toBeUndefined();
		expect(toReleaseUrl('1.2.0')).toBe(
			'https://github.com/layerdbiz/tridentcubed/releases/tag/v1.2.0'
		);
	});
});

describe('a batch as people read it', () => {
	const CHICAGO = 'America/Chicago';

	it('is named by its words, or by when it began on the clock given', () => {
		expect(toBatchTitle({ title: 'Pins and search', from: '2026-11-26T03:00:00Z' }, CHICAGO)).toBe(
			'Pins and search'
		);
		// 03:00 in London is 9 PM the day before in Chicago.
		expect(toBatchTitle({ from: '2026-11-26T03:00:00Z' }, CHICAGO)).toBe('Wednesday night');
		expect(toBatchTitle({ from: '2026-11-26T15:00:00Z' }, CHICAGO)).toBe('Thursday morning');
	});

	it('gives the day it ran, or the days it ran over', () => {
		expect(toBatchWhen({ from: '2026-11-26T15:00:00Z', to: '2026-11-26T20:00:00Z' }, CHICAGO)).toBe(
			'November 26, 2026'
		);
		expect(toBatchWhen({ from: '2026-11-24T15:00:00Z', to: '2026-11-25T20:00:00Z' }, CHICAGO)).toBe(
			'November 24 – 25, 2026'
		);
		expect(toBatchWhen({ from: '2026-11-30T15:00:00Z', to: '2026-12-01T20:00:00Z' }, CHICAGO)).toBe(
			'November 30 – December 1, 2026'
		);
	});
});

describe('the release notes on GitHub', () => {
	const BATCH: HistoryBatchType = {
		from: '2026-11-26T15:00:00Z',
		to: '2026-11-26T20:00:00Z',
		title: 'Pins and search',
		summary: 'Pin anything, find anything.',
		changes: [
			{ kind: 'feature', text: 'Add a Pinned list', tickets: [346], at: '', landed: 3 },
			{ kind: 'improved', text: 'Search groups by page', tickets: [345], at: '', landed: 2 },
			{ kind: 'fix', text: 'Show a pin once', tickets: [346, 345], at: '', landed: 1 }
		]
	};

	it('reads like What’s New: each batch with its title, days and words, then its kinds of change', () => {
		const notes = toReleaseNotes({ batches: [BATCH], others: [] });

		expect(notes).toBe(
			[
				'## Pins and search',
				'',
				'_November 26, 2026 · 1 new · 1 improved · 1 fix_',
				'',
				'Pin anything, find anything.',
				'',
				'### ✨ New features',
				'',
				'- Add a Pinned list (#346)',
				'',
				'### ⬆️ Improved',
				'',
				'- Search groups by page (#345)',
				'',
				'### 🐛 Fixes',
				'',
				'- Show a pin once (#346, #345)',
				''
			].join('\n')
		);
	});

	it('puts the welcome first and what the app does not show last, by area', () => {
		const notes = toReleaseNotes({
			summary: FIRST_SUMMARY,
			batches: [{ ...BATCH, title: undefined, summary: undefined, changes: [BATCH.changes[2]] }],
			others: [{ kind: 'fix', text: 'Call the right number', area: 'site', tickets: [177] }]
		});

		expect(notes.split('\n\n')).toEqual([
			FIRST_SUMMARY,
			'## Thursday morning',
			'_November 26, 2026 · 1 fix_',
			'### 🐛 Fixes',
			'- Show a pin once (#346, #345)',
			'## Behind the scenes',
			'- site: Call the right number (#177)\n'
		]);
	});

	it('still says something when a release holds nothing the team sees', () => {
		expect(toReleaseNotes({ batches: [], others: [] })).toBe('Small changes behind the scenes.\n');
	});
});

describe("the changes What's New lists", () => {
	it('keeps the app and the library, and leaves out the website and the tools', () => {
		const changes: ReleaseChangeType[] = [
			{ kind: 'feature', text: 'In the app', area: 'app', tickets: [] },
			{ kind: 'feature', text: 'On the website', area: 'site', tickets: [] },
			{ kind: 'fix', text: 'In the library', area: 'ui', tickets: [] },
			{ kind: 'fix', text: 'Named nowhere', tickets: [] },
			{ kind: 'fix', text: 'In the prototypes', area: 'play', tickets: [] }
		];

		expect(changes.filter((change) => isAppChange(change)).map((change) => change.text)).toEqual([
			'In the app',
			'In the library',
			'Named nowhere'
		]);
	});
});
