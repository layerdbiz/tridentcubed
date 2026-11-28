import { describe, expect, it } from 'vite-plus/test';
import {
	cleanEdit,
	draggedFrame,
	editOf,
	frameOf,
	fromOldCrop,
	hasEdit,
	lockedAspectOf,
	stagePagesOf,
	perPageLabelOf,
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
		expect(spots[0].w / spots[0].h).toBeCloseTo(2);
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

	it('lets one attachment take a shape of its own over the stage’s, never locked in (Justin, 2026-11-27)', () => {
		const fit = { layout: 4, fit: 'fit' as const, ratio: '16:9' as const };
		const fill = { layout: 4, fit: 'fill' as const };
		expect(lockedAspectOf(fit, {}, { ratio: '1:1' }, 1)).toBeCloseTo(1);
		expect(lockedAspectOf(fit, {}, { ratio: 'free' }, 1)).toBeUndefined();
		expect(lockedAspectOf(fit, {}, { ratio: 'original' }, 4 / 3)).toBeCloseTo(4 / 3);
		expect(lockedAspectOf(fill, {}, { ratio: '9:16' }, 1)).toBeCloseTo(9 / 16);
	});

	it('keeps Free picked over a stage’s shape, as a change of its own', () => {
		expect(cleanEdit({ ratio: 'free' })).toEqual({ ratio: 'free' });
		expect(hasEdit({ ratio: 'free' })).toBe(true);
	});
});

describe('placeOf: an attachment with a shape of its own', () => {
	const own = (stage: StageLayoutType) => {
		const shaped = {
			...stage,
			photos: [{ id: 'own', edit: { ratio: '9:16' as const } }, ...photos(3)]
		};
		const [page] = stagePagesOf(shaped);
		return placeOf(
			page,
			shaped,
			(spot) => (spot.photo.id === 'own' ? 9 / 16 : 16 / 9),
			ROOM.width,
			ROOM.height
		);
	};

	it('keeps it under Fit, where the others keep the stage’s Ratio', () => {
		const [first, second] = own({ layout: 4, fit: 'fit', ratio: '16:9' });
		expect(first.w / first.h).toBeCloseTo(9 / 16);
		expect(second.w / second.h).toBeCloseTo(16 / 9);
	});

	it('keeps it whole in its spot under Fill, in the middle, where the others fill theirs', () => {
		const [first, second] = own({ layout: 4, fit: 'fill' });
		expect(first).toMatchObject({ y: 0, h: 344 });
		expect(first.w).toBeCloseTo((344 * 9) / 16);
		expect(first.x + first.w / 2).toBeCloseTo(122);
		expect(second).toMatchObject({ x: 256, y: 0, w: 244, h: 344 });
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

// Justin, 2026-11-28: "a directional control, which would let you select if it was either left to right or top to
// bottom", Horizontal, Vertical or Auto beside Fill and Fit; Auto turns each page whichever way crops the least.
describe('placeOf: Direction', () => {
	const box = (spots: { x: number; y: number; w: number; h: number }[]) =>
		spots.map(({ x, y, w, h }) => [x, y, w, h].map((each) => Math.round(each)));
	const pagesOf = (stage: StageLayoutType & { photos: { id: string }[] }, aspect: number) =>
		stagePagesOf(stage).map((page) => placeOf(page, stage, () => aspect, 500, 700));

	it('runs two to a page side by side when Horizontal, one over the other when Vertical', () => {
		const stage = { layout: 2, fit: 'fill' as const, photos: photos(2) };
		expect(box(placed({ ...stage, direction: 'horizontal' }))).toEqual([
			[0, 0, 244, 700],
			[256, 0, 244, 700]
		]);
		expect(box(placed({ ...stage, direction: 'vertical' }))).toEqual([
			[0, 0, 500, 344],
			[0, 356, 500, 344]
		]);
	});

	it('fills a page down each column first when Vertical', () => {
		const spots = placed({ layout: 4, fit: 'fill', direction: 'vertical', photos: photos(4) });
		expect(box(spots).map(([x, y]) => [x, y])).toEqual([
			[0, 0],
			[0, 356],
			[256, 0],
			[256, 356]
		]);
	});

	it('lays six to a page three across when Horizontal, three down when Vertical', () => {
		const across = placed({ layout: 6, fit: 'fill', direction: 'horizontal', photos: photos(6) });
		const down = placed({ layout: 6, fit: 'fill', direction: 'vertical', photos: photos(6) });
		expect(new Set(across.map(({ x }) => Math.round(x))).size).toBe(3);
		expect(new Set(down.map(({ x }) => Math.round(x))).size).toBe(2);
	});

	it('keeps a picked grid as picked, either way, and only changes its order', () => {
		const grid = { columns: 3, rows: 2 };
		const across = placed({
			layout: 6,
			grid,
			fit: 'fill',
			direction: 'horizontal',
			photos: photos(6)
		});
		const down = placed({ layout: 6, grid, fit: 'fill', direction: 'vertical', photos: photos(6) });
		expect(new Set(down.map(({ x }) => Math.round(x))).size).toBe(3);
		expect(box([across[1]])).toEqual(box([down[2]]));
	});

	it('under Auto, stacks the last two landscape photos of a page and sets portrait ones side by side', () => {
		// Six at four to a page: the second page holds two (Justin's 16:9 photos, 2026-11-28).
		const stage = {
			layout: 4,
			fit: 'fill' as const,
			direction: 'auto' as const,
			photos: photos(6)
		};
		const [, landscape] = pagesOf(stage, 16 / 9);
		expect(box(landscape)).toEqual([
			[0, 0, 500, 344],
			[0, 356, 500, 344]
		]);
		const [, portrait] = pagesOf(stage, 9 / 16);
		expect(box(portrait)).toEqual([
			[0, 0, 244, 700],
			[256, 0, 244, 700]
		]);
	});

	it('under Auto and Fit, turns the page the way the pictures come out biggest', () => {
		const stage = {
			layout: 2,
			fit: 'fit' as const,
			ratio: 'free' as const,
			direction: 'auto' as const
		};
		const [landscape] = pagesOf({ ...stage, photos: photos(2) }, 16 / 9);
		expect(landscape[0].x).toBe(landscape[1].x);
		const [portrait] = pagesOf({ ...stage, photos: photos(2) }, 9 / 16);
		expect(portrait[0].y).toBe(portrait[1].y);
	});

	it('starts the crop frame in the shape of the page’s cells under Fill, and in the photo’s own under Auto', () => {
		const fill = { layout: 2, fit: 'fill' as const };
		expect(lockedAspectOf({ ...fill, direction: 'horizontal' }, {}, {}, 1)).toBeCloseTo(
			251.5 / 573
		);
		expect(lockedAspectOf({ ...fill, direction: 'vertical' }, {}, {}, 1)).toBeCloseTo(515 / 280.5);
		expect(lockedAspectOf({ ...fill, direction: 'auto' }, {}, {}, 1)).toBeUndefined();
	});

	it('calls every one on one page All', () => {
		expect(perPageLabelOf({ layout: 4, isAuto: true })).toBe('All');
	});
});
