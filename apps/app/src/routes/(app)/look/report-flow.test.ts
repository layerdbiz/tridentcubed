import { describe, expect, it } from 'vite-plus/test';
import { heightOf, paginate, photoPagesOf, targetOf } from './report-flow';

describe('paginate', () => {
	it('keeps everything on one page while it fits', () => {
		expect(paginate([100, 200, 300], 600)).toEqual([[0, 1, 2]]);
	});

	it('starts another page with the block that would not fit', () => {
		expect(paginate([300, 200, 200, 100], 600)).toEqual([
			[0, 1],
			[2, 3]
		]);
	});

	it('gives a block taller than a page a page of its own', () => {
		expect(paginate([100, 900, 100], 600)).toEqual([[0], [1], [2]]);
	});

	it('moves a heading on with the block after it, so it never ends a page', () => {
		const heights = [500, 40, 200];

		expect(paginate(heights, 600, [false, true, false])).toEqual([[0], [1, 2]]);
	});

	it('makes one empty page for a section with nothing in it', () => {
		expect(paginate([], 600)).toEqual([[]]);
	});
});

describe('heightOf', () => {
	it('adds up the blocks on a page', () => {
		expect(heightOf([100, 200, 300], [1, 2])).toBe(500);
	});
});

describe('photoPagesOf', () => {
	const group = (photos: number, layout = 4, isEnabled = true) => ({
		isEnabled,
		layout,
		photos: Array.from({ length: photos })
	});

	it('titles only the first page of the panel; every later page is continued', () => {
		// Two stages: ten photos at four to a page, then three.
		expect(photoPagesOf([group(10), group(3)])).toEqual([
			{ group: 0, part: 0, isContinued: false },
			{ group: 0, part: 1, isContinued: true },
			{ group: 0, part: 2, isContinued: true },
			{ group: 1, part: 0, isContinued: true }
		]);
	});

	it('gives a group with no photos yet one page', () => {
		expect(photoPagesOf([group(0)])).toEqual([{ group: 0, part: 0, isContinued: false }]);
	});

	it('leaves out a group that is switched off, so the next one opens the panel', () => {
		expect(photoPagesOf([group(6, 6, false), group(1), group(2, 1)])).toEqual([
			{ group: 1, part: 0, isContinued: false },
			{ group: 2, part: 0, isContinued: true },
			{ group: 2, part: 1, isContinued: true }
		]);
	});

	it('prints nothing for a panel with every group switched off', () => {
		expect(photoPagesOf([group(4, 4, false)])).toEqual([]);
	});
});

describe('targetOf', () => {
	it('opens at the open panel’s page', () => {
		expect(targetOf(3, 0, 9)).toBe(3);
		expect(targetOf(3, 7, 9)).toBe(3);
	});

	it('opens at the page a report link asked for when no panel is open (#216)', () => {
		expect(targetOf(-1, 7, 9)).toBe(6);
	});

	it('holds a page asked for to the pages there are', () => {
		expect(targetOf(-1, 12, 9)).toBe(8);
		expect(targetOf(-1, 5, 0)).toBe(0);
	});

	it('opens at the first page when nothing is asked for', () => {
		expect(targetOf(-1, 0, 9)).toBe(0);
	});
});
