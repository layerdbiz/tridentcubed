// What's New's history (#399), kept plain (Justin, 2026-11-27): each day under its date, only the features and fixes
// people notice, in everyday words, and the same days as a GitHub release's notes (#157).
import { describe, expect, it } from 'vite-plus/test';
import {
	toBatchCounts,
	toBatches,
	toDay,
	toHistory,
	toHistoryChanges,
	toNewSince,
	toPlainLines,
	toReleaseNotes,
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

	it("ends a day where a release ends, and keeps next's prereleases together", () => {
		const landed = [
			{ ...feature('2026-11-26T14:00:00Z', 'One', 0), release: '1.0.0' },
			{ ...feature('2026-11-26T15:00:00Z', 'Two', 1), release: '1.1.0-next.1' },
			{ ...feature('2026-11-26T16:00:00Z', 'Three', 2), release: '1.1.0-next.2' }
		];

		expect(toBatches(toHistoryChanges(landed)).map((batch) => batch.changes.length)).toEqual([
			1, 2
		]);
	});

	it("names each day by its newest change's release, newest day first, and gives the build its version", () => {
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
			['2026-11-25', '1.0.0-next.1']
		]);
		expect(history.batches[0].changes.map((change) => change.text)).toEqual(['Three', 'Two']);
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

	it('still say something when a release holds nothing to list', () => {
		expect(toReleaseNotes({ batches: [], others: [] })).toBe('Small changes behind the scenes.\n');
	});
});
