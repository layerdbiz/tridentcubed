import { describe, expect, it } from 'vite-plus/test';
import { createFollower, flowOf, heightOf, paginate, photoPagesOf, targetOf } from './report-flow';

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

	it('leaves room for what a block says again when it opens a page (a table row under its headings)', () => {
		// Four rows of 200 fit three to a page of 600; with 100 of headings said again, the second page holds two.
		const heights = [200, 200, 200, 200, 200, 200];
		const leads = [0, 100, 100, 100, 100, 100];

		expect(paginate(heights, 600)).toEqual([
			[0, 1, 2],
			[3, 4, 5]
		]);
		expect(paginate(heights, 600, [], leads)).toEqual([[0, 1, 2], [3, 4], [5]]);
	});
});

// Justin, 2026-11-19: the Project Report's Cargo Description began at a page's foot and left only its totals on
// the next page. A part that would run over starts on a new page.
describe('paginate, with parts that stay whole', () => {
	// A heading of 40 opens each part: one of 300, one of 200, one of three rows of 100.
	const heights = [40, 260, 40, 160, 40, 100, 100, 100];
	const starts = [true, false, true, false, true, false, false, false];
	const glued = [true, false, true, false, true, false, false, false];

	it('moves a part that would run over to a new page, whole', () => {
		expect(paginate(heights, 700, glued, [], starts)).toEqual([
			[0, 1, 2, 3],
			[4, 5, 6, 7]
		]);
		// Without parts, the last rows ran over.
		expect(paginate(heights, 700, glued)).toEqual([
			[0, 1, 2, 3, 4, 5],
			[6, 7]
		]);
	});

	it('leaves the parts together on one page when they all fit', () => {
		expect(paginate(heights, 900, glued, [], starts)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7]]);
	});

	it('does not leave a page empty before a part that opens the section', () => {
		expect(paginate([40, 400, 400], 600, [true], [], [true])).toEqual([[0, 1], [2]]);
	});

	it('starts a part longer than a page on a new page, and lets it run on from there', () => {
		const long = [200, 40, 300, 300, 300];

		expect(paginate(long, 600, [false, true], [], [false, true])).toEqual([[0], [1, 2], [3, 4]]);
	});

	it('counts what comes before the first part as the page it shares', () => {
		// An opening paragraph of 100, then two parts of 300 on a page of 600: the second moves on.
		expect(
			paginate([100, 40, 260, 40, 260], 600, [], [], [false, true, false, true, false])
		).toEqual([
			[0, 1, 2],
			[3, 4]
		]);
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

describe('createFollower', () => {
	const first = { x: 0, y: 0 };

	it('leaves the pages where the User put them when the same target is worked out again (#234)', () => {
		const follow = createFollower();
		follow(0, first, 70);

		// Fresh rows arrived: the page list was rebuilt, the target is the one it was.
		expect(follow(0, { x: 0, y: 0 }, 70)).toBe('stay');
	});

	it('places the canvas the first time, and again when the header over it changes height', () => {
		const follow = createFollower();

		expect(follow(0, first, 0)).toBe('place');
		expect(follow(0, first, 70)).toBe('place');
		expect(follow(0, first, 70)).toBe('stay');
	});

	it('places the canvas again once the project’s own pages have arrived, so every page is fitted', () => {
		const follow = createFollower();
		follow(0, first, 0, false);

		expect(follow(0, first, 0, true)).toBe('place');
		expect(follow(0, first, 0, true)).toBe('stay');
	});

	it('glides when another panel opens or a report link asks for another page', () => {
		const follow = createFollower();
		follow(0, first, 70);

		expect(follow(3, { x: 0, y: 2670 }, 70)).toBe('glide');
		expect(follow(3, { x: 0, y: 2670 }, 70)).toBe('stay');
	});

	it('glides when the target page sits somewhere else, as when the pages are laid out another way', () => {
		const follow = createFollower();
		follow(3, { x: 0, y: 2670 }, 70);

		expect(follow(3, { x: 1929, y: 0 }, 70)).toBe('glide');
	});
});

describe('flowOf', () => {
	const flows = [
		{ key: 'report' },
		{ key: 'transport' },
		{ key: 'timelog' },
		{ key: 'disclaimer' }
	];
	// A panel's id is the database's (#196), never the section's key.
	const panel = (kind: string) => ({ id: '4a1caf0e-7f2f-4191-b370-83033b081a20', kind });

	it('finds the Time Log’s section by what the panel is, not by its id (#223)', () => {
		expect(flowOf(panel('timelog'), flows)).toEqual({ key: 'timelog' });
	});

	it('finds none for a Time Log with nothing to print', () => {
		expect(flowOf(panel('timelog'), [{ key: 'report' }, { key: 'disclaimer' }])).toBeUndefined();
	});

	it('finds Transport Mode’s section the same way (#225)', () => {
		expect(flowOf(panel('transport'), flows)).toEqual({ key: 'transport' });
	});

	it('finds none for a Transport Mode with no flowing section', () => {
		expect(flowOf(panel('transport'), [{ key: 'report' }, { key: 'timelog' }])).toBeUndefined();
	});

	it('finds none for the panels that print pages of their own', () => {
		expect(flowOf(panel('photos'), flows)).toBeUndefined();
		expect(flowOf(panel('project'), flows)).toBeUndefined();
	});
});
