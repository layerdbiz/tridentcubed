// What's New's history (#399): every app change the branch took, folded into batches of work, nothing ever left out.
import { describe, expect, it } from 'vite-plus/test';
import {
	toBatches,
	toHistory,
	toHistoryChanges,
	toNewSince,
	type HistoryBatchSettingsType,
	type LandedType
} from './history.utils';

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
