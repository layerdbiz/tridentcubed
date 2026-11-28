// What's New's history (#399), kept plain (Justin, 2026-11-27): each day under its date, only the features and fixes
// people notice, in everyday words, and the same days as a GitHub release's notes (#157).
import { describe, expect, it } from 'vite-plus/test';
import {
	isHidden,
	isMissingHighlights,
	toBatchCounts,
	toBatchTallies,
	toBatches,
	toDay,
	toHistory,
	toHistoryChanges,
	toNewSince,
	toPlainLines,
	toReleaseNotes,
	toSectionInView,
	type HistoryBatchType,
	type LandedType
} from './history.utils';
import { FIRST_SUMMARY } from './releases.utils';

// A feature landing at the given moment, its plain words in its message.
function feature(at: string, words: string, landed = 0): LandedType {
	return {
		subject: `✨ feat(app): ${words.toLowerCase()}`,
		body: `What's New: ${words}`,
		at,
		landed
	};
}

describe('the plain words of a commit', () => {
	it("are its What's New lines, one per thing people will notice", () => {
		const body = [
			'Adds the pins table and the menu list.',
			'',
			"What's New: Pin anything to the menu.",
			'What’s new: Unpin it from the same place.'
		].join('\n');

		expect(toPlainLines({ subject: '✨ feat(app): add a pinned list (#346)', body })).toEqual([
			'Pin anything to the menu.',
			'Unpin it from the same place.'
		]);
	});

	it('are the words written for it before that rule, else nothing', () => {
		const plain = { 'Add a Pinned list to the menu': 'Pin anything to the menu.' };

		expect(toPlainLines({ subject: '✨ feat(app): add a Pinned list to the menu' }, plain)).toEqual(
			['Pin anything to the menu.']
		);
		expect(toPlainLines({ subject: '🐛 fix(app): keep the dot round' }, plain)).toEqual([]);
	});

	it('are nothing for work people never see, whatever its message says', () => {
		expect(
			toPlainLines({
				subject: '♻️ refactor(app): tidy the menu',
				body: "What's New: A tidier menu."
			})
		).toEqual([]);
	});
});

describe("What's New's history", () => {
	it('lists only what has plain words, as features and fixes, a line met twice once', () => {
		const landed: LandedType[] = [
			{
				subject: '✨ feat(app): show the bell (#348)',
				body: "What's New: A bell.",
				at: '',
				landed: 0
			},
			{
				subject: '⚡ perf(ui): draw the avatar with CSS',
				body: "What's New: Faster faces.",
				at: '',
				landed: 1
			},
			{ subject: '🐛 fix(app): keep the dot round', at: '', landed: 2 },
			{
				subject: '✨ feat(app): show the bell again',
				body: "What's New: A bell.",
				at: '',
				landed: 3
			}
		];

		expect(
			toHistoryChanges(landed).map(({ kind, text, tickets, landed }) => ({
				kind,
				text,
				tickets,
				landed
			}))
		).toEqual([
			{ kind: 'feature', text: 'A bell.', tickets: [348], landed: 0 },
			{ kind: 'fix', text: 'Faster faces.', tickets: [], landed: 1 }
		]);
	});

	it('leaves out the changes of a ticket hidden for now, its work in but switched off for now', () => {
		const landed: LandedType[] = [
			{
				...feature('2026-11-26T03:00:00Z', 'Type in Spanish.', 0),
				subject: '✨ feat(app): spanish (#360)'
			},
			{
				...feature('2026-11-26T04:00:00Z', 'Import a time log.', 1),
				subject: '✨ feat(app): log (#359)'
			}
		];

		expect(toHistoryChanges(landed, {}, [360]).map(({ text }) => text)).toEqual([
			'Import a time log.'
		]);
		expect(
			toHistory('h', [], landed, { hidden: [360] }).batches[0].changes.map(({ text }) => text)
		).toEqual(['Import a time log.']);
		expect(isHidden({ tickets: [359, 360] }, [360])).toBe(true);
		expect(isHidden({ tickets: [359] }, [360])).toBe(false);
	});

	it("tells each day on the team's clock, as 2026-11-27", () => {
		// 03:00 in London is 9 PM the day before in Chicago.
		expect(toDay('2026-11-26T03:00:00Z')).toBe('2026-11-25');
		expect(toDay('2026-11-26T15:00:00Z')).toBe('2026-11-26');
	});

	it('folds the changes into days', () => {
		const changes = toHistoryChanges([
			feature('2026-11-26T03:00:00Z', 'One', 0),
			feature('2026-11-26T15:00:00Z', 'Two', 1),
			feature('2026-11-26T22:00:00Z', 'Three', 2)
		]);

		expect(
			toBatches(changes).map((batch) => [batch.day, batch.changes.map((change) => change.text)])
		).toEqual([
			['2026-11-25', ['One']],
			['2026-11-26', ['Two', 'Three']]
		]);
	});

	it("ends a day where a release ends, next's prereleases too", () => {
		const landed = [
			{ ...feature('2026-11-26T14:00:00Z', 'One', 0), release: '1.0.0' },
			{ ...feature('2026-11-26T15:00:00Z', 'Two', 1), release: '1.1.0-next.1' },
			{ ...feature('2026-11-26T15:30:00Z', 'Three', 2), release: '1.1.0-next.1' },
			{ ...feature('2026-11-26T16:00:00Z', 'Four', 3), release: '1.1.0-next.2' },
			{ ...feature('2026-11-26T17:00:00Z', 'Five', 4) }
		];

		expect(toBatches(toHistoryChanges(landed)).map((batch) => batch.changes.length)).toEqual([
			1, 2, 1, 1
		]);
	});

	it('keeps a release made on dev in one section, however many days it took; next keeps a section a day', () => {
		const landed = [
			{ ...feature('2026-11-26T15:00:00Z', 'One', 0), release: '1.1.0' },
			{ ...feature('2026-11-27T15:00:00Z', 'Two', 1), release: '1.1.0' },
			{ ...feature('2026-11-28T15:00:00Z', 'Three', 2), release: '1.2.0-next.1' },
			{ ...feature('2026-11-29T15:00:00Z', 'Four', 3), release: '1.2.0-next.1' }
		];

		expect(
			toBatches(toHistoryChanges(landed)).map((batch) => [
				batch.day,
				batch.changes.map((change) => change.text)
			])
		).toEqual([
			['2026-11-27', ['One', 'Two']],
			['2026-11-28', ['Three']],
			['2026-11-29', ['Four']]
		]);
	});

	it('dates a release made on dev the day it reached dev, not the days its work landed on next', () => {
		const landed = [
			{ ...feature('2026-11-25T15:00:00Z', 'One', 0), release: '1.0.0' },
			{ ...feature('2026-11-26T15:00:00Z', 'Two', 1), release: '1.1.0' },
			{ ...feature('2026-11-27T15:00:00Z', 'Three', 2), release: '1.1.0' }
		];
		const releases = [
			{ version: '1.0.0', url: 'https://example.com/v1.0.0', date: '2026-11-26T03:00:00Z' },
			{ version: '1.1.0', url: 'https://example.com/v1.1.0', date: '2026-11-30T15:00:00Z' }
		];
		const history = toHistory('abc', ['a', 'b', 'c'], landed, {
			releases,
			highlights: { '1.0.0': { features: [{ title: 'Sign in.', points: [] }], fixes: [] } }
		});

		expect(
			history.batches.map((batch) => [
				batch.day,
				batch.release?.version,
				batch.changes.map((change) => change.text)
			])
		).toEqual([
			['2026-11-30', '1.1.0', ['Three', 'Two']],
			['2026-11-25', '1.0.0', ['Sign in.']]
		]);
		expect(toReleaseNotes({ batches: history.batches.slice(0, 1), others: [] })).toBe(
			'## 2026-11-30\n\n### ✨ Features\n\n- Three\n- Two\n'
		);
	});

	it('names each section by its release, newest first, and gives the build its version', () => {
		const landed = [
			{ ...feature('2026-11-25T15:00:00Z', 'One', 0), release: '1.0.0-next.1' },
			{ ...feature('2026-11-26T15:00:00Z', 'Two', 1), release: '1.0.0-next.1' },
			{ ...feature('2026-11-26T16:00:00Z', 'Three', 2), release: '1.0.0-next.2' }
		];
		const releases = ['1.0.0-next.1', '1.0.0-next.2'].map((version) => ({
			version,
			url: `https://example.com/v${version}`
		}));
		const history = toHistory('abc', ['a', 'b', 'c'], landed, {
			releases,
			version: 'v1.0.0-next.2'
		});

		expect(history.version).toBe('v1.0.0-next.2');
		expect(history.batches.map((batch) => [batch.day, batch.release?.version])).toEqual([
			['2026-11-26', '1.0.0-next.2'],
			['2026-11-26', '1.0.0-next.1'],
			['2026-11-25', '1.0.0-next.1']
		]);
		expect(history.batches[1].changes.map((change) => change.text)).toEqual(['Two']);
	});

	it('tells a release that has highlights in them: titled features and fixes, in place of its lines', () => {
		const landed = [
			{ ...feature('2026-11-25T15:00:00Z', 'One', 0), release: '1.0.0' },
			{ ...feature('2026-11-26T15:00:00Z', 'Two', 1), release: '1.1.0' },
			{
				subject: '🐛 fix(app): three',
				body: "What's New: Three.",
				at: '2026-11-26T16:00:00Z',
				landed: 2,
				release: '1.1.0'
			},
			{ ...feature('2026-11-28T15:00:00Z', 'Four', 3), release: '1.2.0' }
		];
		const releases = ['1.0.0', '1.1.0', '1.2.0'].map((version) => ({
			version,
			url: `https://example.com/v${version}`
		}));
		const history = toHistory('abc', ['a', 'b', 'c', 'd'], landed, {
			releases,
			highlights: {
				'1.1.0': {
					features: [
						{ title: 'Sign in', points: ['With Google.', 'With a code.'] },
						{ title: 'Search', points: ['From the menu.'] }
					],
					fixes: [{ title: 'Pins', points: ['A pin shows once.'] }]
				}
			}
		});

		expect(
			history.batches.map((batch) => [
				batch.day,
				batch.release?.version,
				batch.changes.map((change) => [change.kind, change.text, change.points ?? []])
			])
		).toEqual([
			['2026-11-28', '1.2.0', [['feature', 'Four', []]]],
			[
				'2026-11-26',
				'1.1.0',
				[
					['feature', 'Sign in', ['With Google.', 'With a code.']],
					['feature', 'Search', ['From the menu.']],
					['fix', 'Pins', ['A pin shows once.']]
				]
			],
			['2026-11-25', '1.0.0', [['feature', 'One', []]]]
		]);
		// Everything the release brought counts as landing with its last change.
		expect(history.batches[1].changes.map((change) => change.landed)).toEqual([2, 2, 2]);
		expect(toBatchCounts(history.batches[1])).toEqual(['2 features', '1 fix']);
	});

	it("lists next's prereleases as they are, the highlights of the release they lead to aside", () => {
		const landed = [{ ...feature('2026-11-26T15:00:00Z', 'One', 0), release: '1.0.0-next.1' }];

		expect(
			toHistory('abc', ['a'], landed, {
				highlights: { '1.0.0': { features: [{ title: 'Sign in', points: [] }], fixes: [] } }
			}).batches[0].changes.map((change) => change.text)
		).toEqual(['One']);
	});

	it('gives next.app its release notes: the release to come, then each release on dev, as dev.app tells them', () => {
		const landed = [
			{ ...feature('2026-11-26T15:00:00Z', 'One', 0), release: '1.2.0-next.1' },
			{ ...feature('2026-11-27T15:00:00Z', 'Two', 1), release: '1.2.0-next.2' }
		];
		const history = toHistory('abc', ['a', 'b'], landed, {
			releases: [
				...['1.2.0-next.1', '1.2.0-next.2'].map((version) => ({
					version,
					url: `https://example.com/v${version}`
				})),
				{ version: '1.0.0', url: 'https://example.com/v1.0.0', date: '2026-11-20T15:00:00Z' },
				{ version: '1.1.0', url: 'https://example.com/v1.1.0', date: '2026-11-24T15:00:00Z' }
			],
			highlights: {
				'1.0.0': { features: [{ title: 'Sign in', points: ['With Google.'] }], fixes: [] },
				'1.1.0': { features: [], fixes: [{ title: 'Pins', points: ['A pin shows once.'] }] },
				'1.2.0': { features: [{ title: 'Search', points: ['From the menu.'] }], fixes: [] }
			},
			upcoming: '1.2.0'
		});

		expect(
			history.notes?.map((batch) => [
				batch.isUpcoming ?? false,
				batch.day,
				batch.release?.version,
				batch.changes.map((change) => change.text)
			])
		).toEqual([
			[true, '2026-11-27', '1.2.0', ['Search']],
			[false, '2026-11-24', '1.1.0', ['Pins']],
			[false, '2026-11-20', '1.0.0', ['Sign in']]
		]);
		// Every change is the list as it is, with nothing to come in it; none of the notes counts as new.
		expect(history.batches.map((batch) => batch.release?.version)).toEqual([
			'1.2.0-next.2',
			'1.2.0-next.1'
		]);
		expect(history.notes?.flatMap((batch) => batch.changes.map((change) => change.landed))).toEqual(
			[-1, -1, -1]
		);
		expect(toNewSince(history, 'a')).toHaveLength(1);
	});

	it('gives next.app its releases on dev while the release to come is not written', () => {
		const landed = [{ ...feature('2026-11-26T15:00:00Z', 'One', 0), release: '1.2.0-next.1' }];
		const history = toHistory('abc', ['a'], landed, {
			releases: [
				{ version: '1.1.0', url: 'https://example.com/v1.1.0', date: '2026-11-24T15:00:00Z' }
			],
			highlights: { '1.1.0': { features: [{ title: 'Pins', points: [] }], fixes: [] } },
			upcoming: '1.2.0'
		});

		expect(
			history.notes?.map((batch) => [batch.isUpcoming ?? false, batch.release?.version])
		).toEqual([[false, '1.1.0']]);
	});

	it('gives no release notes where nothing is written, and none on dev, whose list is its notes', () => {
		const landed = [{ ...feature('2026-11-26T15:00:00Z', 'One', 0), release: '1.2.0-next.1' }];

		expect(toHistory('abc', ['a'], landed, { upcoming: '1.2.0' }).notes).toBeUndefined();
		expect(
			toHistory('abc', ['a'], [{ ...landed[0], release: '1.1.0' }], {
				highlights: { '1.1.0': { features: [{ title: 'Pins', points: [] }], fixes: [] } }
			}).notes
		).toBeUndefined();
	});

	it('knows a release made without its highlights, and never asks them of a prerelease', () => {
		const highlights = { '1.1.0': { features: [], fixes: [] } };

		expect(isMissingHighlights('1.2.0', highlights)).toBe(true);
		expect(isMissingHighlights('1.1.0', highlights)).toBe(false);
		expect(isMissingHighlights('1.2.0-next.4', highlights)).toBe(false);
	});

	it('has no version, and days with no release, while nothing is released', () => {
		const history = toHistory('abc', ['a'], [feature('2026-11-26T15:00:00Z', 'One')]);

		expect(history.version).toBeUndefined();
		expect(history.batches[0].release).toBeUndefined();
	});

	it('tells which changes landed after the commit last seen, and none for a commit it does not hold', () => {
		const history = toHistory(
			'cccccccccccccc',
			['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'],
			[0, 1, 2].map((index) => feature('2026-11-26T15:00:00Z', `Thing ${index}`, index))
		);

		expect(toNewSince(history, 'aaaaaaaaaaaaaaaa').map((change) => change.landed)).toEqual([2, 1]);
		expect(toNewSince(history, 'cccccccccccccccc')).toEqual([]);
		expect(toNewSince(history, 'dddddddddddd')).toEqual([]);
	});

	it('names the section whose top has passed the top of the scroll, and the last one at the end', () => {
		const tops = [0, 300, 900, 1400];

		expect(toSectionInView(tops, 24)).toBe(0);
		expect(
			toSectionInView(
				tops.map((top) => top - 320),
				24
			)
		).toBe(1);
		expect(
			toSectionInView(
				tops.map((top) => top - 1390),
				24
			)
		).toBe(3);
		expect(
			toSectionInView(
				tops.map((top) => top - 800),
				24,
				true
			)
		).toBe(3);
		expect(toSectionInView([], 24)).toBe(0);
	});

	it('names the open section at the end of the scroll while it is on screen, else the last', () => {
		// Scrolled to the end: section 1's top is past the line, 2 and 3 are on screen below it.
		const tops = [-700, -20, 200, 500];

		expect(toSectionInView(tops, 64, true, 2)).toBe(2);
		expect(toSectionInView(tops, 64, true, 1)).toBe(1);
		expect(toSectionInView(tops, 64, true, 0)).toBe(3);
		expect(toSectionInView(tops, 64, true)).toBe(3);
		expect(toSectionInView(tops, 64, false, 2)).toBe(1);
	});

	it('counts the features and fixes a day holds, only the kinds it has', () => {
		const change = { tickets: [], at: '', landed: 0 };
		expect(
			toBatchCounts({
				changes: [
					{ ...change, kind: 'feature', text: 'A' },
					{ ...change, kind: 'feature', text: 'B' },
					{ ...change, kind: 'fix', text: 'C' }
				]
			})
		).toEqual(['2 features', '1 fix']);
		expect(toBatchCounts({ changes: [{ ...change, kind: 'fix', text: 'C' }] })).toEqual(['1 fix']);
		expect(toBatchTallies({ changes: [{ ...change, kind: 'fix', text: 'C' }] })).toEqual([
			{ kind: 'fix', text: '1 fix' }
		]);
	});
});

describe('the release notes on GitHub', () => {
	const DAY: HistoryBatchType = {
		day: '2026-11-26',
		from: '2026-11-26T15:00:00Z',
		to: '2026-11-26T20:00:00Z',
		changes: [
			{ kind: 'feature', text: 'Pin anything to the menu.', tickets: [346], at: '', landed: 3 },
			{ kind: 'fix', text: 'A pin shows once.', tickets: [346, 345], at: '', landed: 1 }
		]
	};

	it('read like What’s New: each day under its date, then its features and fixes', () => {
		expect(toReleaseNotes({ batches: [DAY], others: [] })).toBe(
			[
				'## 2026-11-26',
				'',
				'### ✨ Features',
				'',
				'- Pin anything to the menu. (#346)',
				'',
				'### 🐛 Fixes',
				'',
				'- A pin shows once. (#346, #345)',
				''
			].join('\n')
		);
	});

	it('put the words above first, and fold the rest away under Behind the scenes', () => {
		const notes = toReleaseNotes({
			summary: FIRST_SUMMARY,
			batches: [{ ...DAY, changes: [DAY.changes[1]] }],
			others: [{ kind: 'fix', text: 'Call the right number', area: 'site', tickets: [177] }]
		});

		expect(notes.split('\n\n')).toEqual([
			FIRST_SUMMARY,
			'## 2026-11-26',
			'### 🐛 Fixes',
			'- A pin shows once. (#346, #345)',
			'<details><summary>Behind the scenes</summary>',
			'- site: Call the right number (#177)',
			'</details>\n'
		]);
	});

	it('give a titled feature its title in bold and its highlights under it', () => {
		const notes = toReleaseNotes({
			batches: [
				{
					...DAY,
					changes: [
						{
							kind: 'feature',
							text: 'Pins',
							points: ['Pin anything to the menu.', 'Unpin it there too.'],
							tickets: [],
							at: '',
							landed: 3
						}
					]
				}
			],
			others: []
		});

		expect(notes).toBe(
			[
				'## 2026-11-26',
				'',
				'### ✨ Features',
				'',
				'- **Pins**',
				'  - Pin anything to the menu.',
				'  - Unpin it there too.',
				''
			].join('\n')
		);
	});

	it('still say something when a release holds nothing to list', () => {
		expect(toReleaseNotes({ batches: [], others: [] })).toBe('Small changes behind the scenes.\n');
	});
});
