import { describe, expect, it } from 'vite-plus/test';
import {
	draggedFrame,
	editOf,
	frameOf,
	fromOldCrop,
	lockedAspectOf,
	stagePagesOf,
	placeOf,
	toPageGrid,
	toStageGrid,
	type StageLayoutType
} from './attachments';

const photos = (count: number) => Array.from({ length: count }, (_, at) => ({ id: `p${at}` }));
const ROOM = { width: 500, height: 700 };

function placed(stage: StageLayoutType & { photos: { id: string }[] }, aspect = 4 / 3) {
	const [page] = stagePagesOf(stage);
	return placeOf(page, stage, () => aspect, ROOM.width, ROOM.height);
}

describe('placeOf: Fill fills the page (Justin, 2026-11-27)', () => {
	it('lays four to a page in two rows that reach from margin to margin and down to the footer', () => {
		const spots = placed({ layout: 4, fit: 'fill', photos: photos(4) });
		expect(spots.map(({ x, y, w, h }) => [x, y, w, h])).toEqual([
			[0, 0, 244, 344],
			[256, 0, 244, 344],
			[0, 356, 244, 344],
			[256, 356, 244, 344]
		]);
	});

	it('fills the page whatever the Ratio, as Fill does', () => {
		const square = placed({ layout: 4, fit: 'fill', ratio: '1:1', photos: photos(4) });
		expect(square.at(-1)).toMatchObject({ y: 356, h: 344 });
	});

	it('shares a short last row among the spots it has, so the last page fills too', () => {
		// Three at four to a page: two above, one across the whole width below.
		const spots = placed({ layout: 4, fit: 'fill', photos: photos(3) });
		expect(spots.at(-1)).toMatchObject({ x: 0, y: 356, w: 500, h: 344 });
	});

	it('under Auto, fills the page with every spot', () => {
		const spots = placed({ layout: 4, isAuto: true, fit: 'fill', photos: photos(9) });
		expect(spots).toHaveLength(9);
		const bottom = Math.max(...spots.map(({ y, h }) => y + h));
		const right = Math.max(...spots.map(({ x, w }) => x + w));
		expect(bottom).toBeCloseTo(700);
		expect(right).toBeCloseTo(500);
	});
});

describe('placeOf: Fit keeps the Ratio', () => {
	it('keeps four 4:3 spots in their shape, leaving the rest of the page', () => {
		const spots = placed({ layout: 4, fit: 'fit', ratio: '4:3', photos: photos(4) });
		expect(spots[0]).toMatchObject({ w: 244, h: 183 });
		expect(spots.at(-1)!.y).toBeLessThan(356);
	});

	it('gives each spot its own shape under Free', () => {
		const [page] = stagePagesOf({ layout: 2, fit: 'fit', ratio: 'free', photos: photos(2) });
		const spots = placeOf(
			page,
			{ layout: 2, fit: 'fit', ratio: 'free' },
			(spot) => (spot.photo.id === 'p0' ? 2 : 0.5),
			500,
			700
		);
		expect(spots[0]).toMatchObject({ w: 500, h: 250 });
		expect(spots[1].w / spots[1].h).toBeCloseTo(0.5);
	});
});

describe('stagePagesOf', () => {
	it('deals the spots a grid at a time, a picked grid as much as a button', () => {
		const stage = { layout: 4, grid: { columns: 3, rows: 2 }, photos: photos(8) };
		expect(stagePagesOf(stage).map((page) => page.spots.length)).toEqual([6, 2]);
	});

	it('puts up to 100 on one page under Auto', () => {
		expect(
			stagePagesOf({ layout: 4, isAuto: true, photos: photos(120) }).map(
				(page) => page.spots.length
			)
		).toEqual([100, 20]);
	});

	it('gives an attachment popped out its own pages, with its own per page, between the others', () => {
		const stage = {
			layout: 4,
			photos: [
				{ id: 'a' },
				{ id: 'b' },
				{ id: 'plan', kind: 'pdf' as const, pageCount: 3, ownLayout: 2 },
				{ id: 'c' }
			]
		};
		expect(
			stagePagesOf(stage).map((page) => [page.mode, page.spots.map((spot) => spot.key)])
		).toEqual([
			['grid', ['a:1', 'b:1']],
			['alone', ['plan:1', 'plan:2']],
			['alone', ['plan:3']],
			['grid', ['c:1']]
		]);
	});

	it('keeps one page for a stage with nothing in it yet', () => {
		expect(stagePagesOf({ layout: 4, photos: [] })).toHaveLength(1);
	});
});

describe('draggedFrame: the crop frame grows and shrinks from its middle (Justin, 2026-11-27)', () => {
	const start = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };

	it('grows both sides at once when the bottom right corner is pulled out', () => {
		const frame = draggedFrame(start, 'se', 0.1, 0.1);
		for (const [key, value] of Object.entries({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 }))
			expect(frame[key as keyof typeof frame]).toBeCloseTo(value);
	});

	it('shrinks toward its middle when an edge is pushed in', () => {
		const frame = draggedFrame(start, 'e', -0.1, 0);
		expect(frame.x).toBeCloseTo(0.35);
		expect(frame.w).toBeCloseTo(0.3);
		expect(frame.y).toBe(0.25);
	});

	it('slides in from the picture edge it is grown against', () => {
		const frame = draggedFrame({ x: 0.6, y: 0.3, w: 0.3, h: 0.3 }, 'e', 0.2, 0);
		expect(frame.x + frame.w).toBeCloseTo(1);
		expect(frame.w).toBeCloseTo(0.7);
	});

	it('keeps a kept shape', () => {
		const frame = draggedFrame(start, 'se', 0.1, 0, 2);
		expect(frame.w / frame.h).toBeCloseTo(2);
	});
});

describe('an edit', () => {
	it('reads a crop from before as a frame in the photo’s own shape around the same middle', () => {
		expect(fromOldCrop({ zoom: 2, x: 0.5, y: 0.5 })).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
	});

	it('draws a PDF page with its own edit when it has one, else the PDF’s', () => {
		const pdf = {
			id: 'plan',
			kind: 'pdf' as const,
			edit: { turns: 1 },
			pageEdits: { 2: { isFlipped: true } }
		};
		expect(editOf(pdf, 1)).toEqual({ turns: 1 });
		expect(editOf(pdf, 2)).toEqual({ isFlipped: true });
	});

	it('keeps what a crop zoomed in on when the stage’s Ratio gives it another shape', () => {
		// A square crop of the middle quarter of a square photo, shown at 2:1.
		const frame = frameOf({ frame: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } }, 1, 2);
		expect(frame.w / frame.h).toBeCloseTo(2);
		expect(frame.w * frame.h).toBeCloseTo(0.25);
		expect(frame.x + frame.w / 2).toBeCloseTo(0.5);
		// The whole photo at 2:1: as wide as it is, half as tall.
		expect(frameOf({}, 1, 2)).toEqual({ x: 0, y: 0.25, w: 1, h: 0.5 });
	});

	it('keeps the crop frame to the stage’s Ratio under Fit, and leaves a PDF’s page its own', () => {
		const stage = { layout: 4, fit: 'fit' as const, ratio: '16:9' as const };
		expect(lockedAspectOf(stage, {}, {}, 1)).toBeCloseTo(16 / 9);
		expect(lockedAspectOf(stage, { kind: 'pdf' }, {}, 1)).toBeUndefined();
	});
});

describe('a picked grid', () => {
	it('goes back to its button when a button has the same', () => {
		expect(toStageGrid({ columns: 2, rows: 3 })).toEqual({ layout: 6, grid: undefined });
		expect(toStageGrid({ columns: 3, rows: 3 })).toEqual({
			layout: 8,
			grid: { columns: 3, rows: 3 }
		});
	});

	it('is read back from its text', () => {
		expect(toPageGrid('3x2')).toEqual({ columns: 3, rows: 2 });
		expect(toPageGrid('')).toBeUndefined();
	});
});
