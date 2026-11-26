// What's New's history (#399): every app change the branch took, folded into batches of work, nothing ever left out,
// and the same batches as a GitHub release's notes (#157).
import { describe, expect, it } from 'vite-plus/test';
import {
	toBatchTitle,
	toBatchWhen,
	toBatches,
	toHistory,
	toHistoryChanges,
	toNewSince,
	toReleaseNotes,
	type HistoryBatchSettingsType,
	type HistoryBatchType,
	type LandedType
} from './history.utils';
import { FIRST_SUMMARY, TEAM_TIME_ZONE } from './releases.utils';

// Changes landing at the given hours of one day, each on its own commit.
function at(hour: number) {
	return new Date(Date.UTC(2026, 10, 25, 0, 0) + hour * 3_600_000).toISOString();
}

function landedAt(hours: number[], subject = (index: number) => `✨ feat(app): thing ${index}`) {
	return hours.map((hour, index) => ({ subject: subject(index), at: at(hour), landed: index }));
}

const LOOSE: HistoryBatchSettingsType = { gapHours: 4, longestHours: 24, fewest: 1 };

describe("What's New's history", () => {
	it('keeps the app and library features and fixes, and leaves out the rest', () => {
		const landed: LandedType[] = [
			{ subject: '✨ feat(app): show the bell (#348)', at: at(0), landed: 0 },
			{ subject: '🐛 fix(ui): keep the dot round', at: at(1), landed: 1 },
			{ subject: '✨ feat(site): a new hero', at: at(1), landed: 1 },
			{ subject: '♻️ refactor(app): tidy the menu', at: at(2), landed: 2 },
			{ subject: '⚡ perf(ui): draw the avatar with CSS (#379)', at: at(2), landed: 2 },
			{ subject: '🔀 merge(app): bring the bell onto next', at: at(3), landed: 3 }
		];

		expect(
			toHistoryChanges(landed).map(({ kind, text, tickets }) => ({ kind, text, tickets }))
		).toEqual([
			{ kind: 'feature', text: 'Show the bell', tickets: [348] },
			{ kind: 'fix', text: 'Keep the dot round', tickets: [] },
			{ kind: 'improved', text: 'Draw the avatar with CSS', tickets: [379] }
		]);
	});

	it('lists a title met twice once, where it first landed', () => {
		const changes = toHistoryChanges([
			{ subject: '✨ feat(app): show the bell', at: at(0), landed: 0 },
			{ subject: '✨ feat(app): show the bell', at: at(9), landed: 4 }
		]);

		expect(changes).toHaveLength(1);
		expect(changes[0].landed).toBe(0);
	});

	it('starts a new batch after four quiet hours', () => {
		const batches = toBatches(toHistoryChanges(landedAt([0, 1, 3.5, 8, 9])), LOOSE);

		expect(batches.map((batch) => batch.changes.length)).toEqual([3, 2]);
		expect(batches[0]).toMatchObject({ from: at(0), to: at(3.5) });
	});

	it('closes a batch once it spans a day, even with no break', () => {
		const batches = toBatches(
			toHistoryChanges(landedAt([0, 3, 6, 9, 12, 15, 18, 21, 24, 27])),
			LOOSE
		);

		expect(batches.map((batch) => batch.changes.length)).toEqual([9, 1]);
	});

	it('never leaves a batch of one or two when more came after: it joins the next', () => {
		const batches = toBatches(toHistoryChanges(landedAt([0, 10, 11, 12, 20, 30])));

		expect(batches.map((batch) => batch.changes.length)).toEqual([4, 2]);
		expect(batches[0]).toMatchObject({ from: at(0), to: at(12) });
	});

	it('calls a feature for a ticket an earlier batch brought out an improvement', () => {
		const landed = landedAt([0, 1, 10, 11], (index) =>
			index === 2
				? '✨ feat(app): pin from the search too (#346)'
				: `✨ feat(app): thing ${index} (#346)`
		);
		const batches = toBatches(toHistoryChanges(landed), LOOSE);

		expect(batches[0].changes.map((change) => change.kind)).toEqual(['feature', 'feature']);
		expect(batches[1].changes.map((change) => change.kind)).toEqual(['improved', 'improved']);
	});

	it('gives a batch the words written for its time, and lists the batches newest first', () => {
		const history = toHistory('abc', ['a', 'b'], landedAt([0, 1, 2, 10, 11, 12]), [
			{ at: at(11), title: 'Pins and search', summary: 'Pin anything, find anything.' }
		]);

		expect(history.batches.map((batch) => batch.title)).toEqual(['Pins and search', undefined]);
		expect(history.batches[0].summary).toBe('Pin anything, find anything.');
	});

	it('ends a batch where a release ends, and keeps a small one inside its own release', () => {
		const landed = landedAt([0, 1, 2, 3, 4]).map((each, index) => ({
			...each,
			release: index < 1 ? '1.0.0' : index < 4 ? '1.1.0' : undefined
		}));
		const batches = toBatches(toHistoryChanges(landed));

		expect(batches.map((batch) => batch.changes.map((change) => change.release))).toEqual([
			['1.0.0'],
			['1.1.0', '1.1.0', '1.1.0'],
			[undefined]
		]);
	});

	it('gives each batch the release that brought it and the build its version (#400)', () => {
		const landed = landedAt([0, 1, 2, 10, 11, 12]).map((each, index) => ({
			...each,
			...(index < 3 ? { release: '1.0.0' } : {})
		}));
		const release = { version: '1.0.0', url: 'https://example.com/v1.0.0' };
		const history = toHistory('abc', ['a', 'b'], landed, [], {
			releases: [release],
			version: 'v1.1.0-next.3'
		});

		expect(history.version).toBe('v1.1.0-next.3');
		expect(history.batches.map((batch) => batch.release)).toEqual([undefined, release]);
	});

	it('is the batches of today, with no version, while nothing is released', () => {
		const history = toHistory('abc', ['a', 'b'], landedAt([0, 1, 2]));

		expect(history.version).toBeUndefined();
		expect(history.batches[0].release).toBeUndefined();
	});

	it('tells which changes landed after the commit last seen, and none for a commit it does not hold', () => {
		const history = toHistory(
			'cccccccccccccc',
			['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'],
			landedAt([0, 1, 2])
		);

		expect(toNewSince(history, 'aaaaaaaaaaaaaaaa').map((change) => change.landed)).toEqual([2, 1]);
		expect(toNewSince(history, 'cccccccccccccccc')).toEqual([]);
		expect(toNewSince(history, 'dddddddddddd')).toEqual([]);
	});
});

describe('a batch as people read it', () => {
	it('is named by its words, or by when it began on the clock given', () => {
		expect(
			toBatchTitle({ title: 'Pins and search', from: '2026-11-26T03:00:00Z' }, TEAM_TIME_ZONE)
		).toBe('Pins and search');
		// 03:00 in London is 9 PM the day before in Chicago.
		expect(toBatchTitle({ from: '2026-11-26T03:00:00Z' }, TEAM_TIME_ZONE)).toBe('Wednesday night');
		expect(toBatchTitle({ from: '2026-11-26T15:00:00Z' }, TEAM_TIME_ZONE)).toBe('Thursday morning');
	});

	it('gives the day it ran, or the days it ran over', () => {
		expect(
			toBatchWhen({ from: '2026-11-26T15:00:00Z', to: '2026-11-26T20:00:00Z' }, TEAM_TIME_ZONE)
		).toBe('November 26, 2026');
		expect(
			toBatchWhen({ from: '2026-11-24T15:00:00Z', to: '2026-11-25T20:00:00Z' }, TEAM_TIME_ZONE)
		).toBe('November 24 – 25, 2026');
		expect(
			toBatchWhen({ from: '2026-11-30T15:00:00Z', to: '2026-12-01T20:00:00Z' }, TEAM_TIME_ZONE)
		).toBe('November 30 – December 1, 2026');
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
