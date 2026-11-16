import { describe, expect, it } from 'vite-plus/test';
import { tallyOf, toTally } from './tally';

describe('how much of a section is filled in', () => {
	it('counts words, picks, lists with something in them and a plain yes', () => {
		expect(tallyOf(['Barge move', '  ', undefined, ['Ana'], [], true, false])).toEqual({
			done: 3,
			total: 7
		});
	});

	it('reads the way a panel does', () => {
		expect(toTally(['Barge move', '', ''])).toBe('1 of 3 complete');
	});

	it('has one thing to do when nothing is in it yet', () => {
		expect(toTally([])).toBe('0 of 1 complete');
	});
});
