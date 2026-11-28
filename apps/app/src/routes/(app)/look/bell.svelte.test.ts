import { describe, expect, it } from 'vite-plus/test';
import type { HistoryBatchType } from '#lib/releases/history.utils.js';
import type { WhatsNewState } from '#lib/releases/releases.state.svelte.js';
import { toReleaseLines } from './bell.svelte';

function batch(day: string, to: string, version?: string, landed = 1): HistoryBatchType {
	return {
		day,
		from: to,
		to,
		...(version ? { release: { version, url: `https://example.com/${version}` } } : {}),
		changes: [{ text: `Thing at ${to}`, landed } as HistoryBatchType['changes'][number]]
	};
}

function whatsNewOf(batches: HistoryBatchType[], seenAt = 0) {
	return { history: { head: '', chain: [], batches }, seenAt } as unknown as WhatsNewState;
}

describe("the bell's new versions (#403)", () => {
	// Every push to next is a release of its own (#400), so one day can hold several: each is a line of its own,
	// named by its version, and the list never sees two lines with one id.
	it('gives each release of one day a line of its own, by its version', () => {
		const lines = toReleaseLines(
			whatsNewOf([
				batch('2026-11-27', '2026-11-27T10:40:00Z', '1.0.0-next.6', 3),
				batch('2026-11-27', '2026-11-27T09:20:00Z', '1.0.0-next.5', 2),
				batch('2026-11-27', '2026-11-27T08:00:00Z', '1.0.0-next.4', 1)
			])
		);
		expect(new Set(lines.map((line) => line.id)).size).toBe(3);
		expect(lines.map((line) => line.title)).toEqual([
			'v1.0.0-next.6',
			'v1.0.0-next.5',
			'v1.0.0-next.4'
		]);
		// A tap opens What's New at its own section.
		expect(lines[1].from).toBe('2026-11-27T09:20:00Z');
	});

	// Justin, 2026-11-28: a day's versions fold into one line that shows them all, so a busy day keeps every one.
	it('keeps every version of the three newest days', () => {
		const lines = toReleaseLines(
			whatsNewOf([
				batch('2026-11-27', '2026-11-27T10:40:00Z', '1.0.0-next.6'),
				batch('2026-11-27', '2026-11-27T09:20:00Z', '1.0.0-next.5'),
				batch('2026-11-27', '2026-11-27T08:00:00Z', '1.0.0-next.4'),
				batch('2026-11-26', '2026-11-26T08:00:00Z', '1.0.0-next.3'),
				batch('2026-11-25', '2026-11-25T08:00:00Z', '1.0.0-next.2'),
				batch('2026-11-24', '2026-11-24T08:00:00Z', '1.0.0-next.1')
			])
		);
		expect(lines.map((line) => line.title)).toEqual([
			'v1.0.0-next.6',
			'v1.0.0-next.5',
			'v1.0.0-next.4',
			'v1.0.0-next.3',
			'v1.0.0-next.2'
		]);
	});

	it('leaves out the release to come, which What’s New shows as Coming to dev', () => {
		const lines = toReleaseLines(
			whatsNewOf([
				{ ...batch('2026-11-28', '2026-11-28T10:40:00Z', '1.2.0', -1), isUpcoming: true },
				batch('2026-11-28', '2026-11-28T10:40:00Z', '1.2.0-next.19', 3)
			])
		);
		expect(lines.map((line) => line.title)).toEqual(['v1.2.0-next.19']);
	});

	it('names what is not released yet by its day', () => {
		const [line] = toReleaseLines(whatsNewOf([batch('2026-11-27', '2026-11-27T10:40:00Z')]));
		expect(line.title).toBe('2026-11-27');
	});

	it('is new while a thing in it was not seen in What’s New', () => {
		const lines = toReleaseLines(
			whatsNewOf(
				[
					batch('2026-11-27', '2026-11-27T10:40:00Z', '1.0.0-next.6', 3),
					batch('2026-11-27', '2026-11-27T09:20:00Z', '1.0.0-next.5', 2)
				],
				2
			)
		);
		expect(lines.map((line) => line.isNew)).toEqual([true, false]);
	});
});
