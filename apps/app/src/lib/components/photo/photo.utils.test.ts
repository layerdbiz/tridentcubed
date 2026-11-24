import { describe, expect, it } from 'vite-plus/test';
import { MOST_ZOOM, WHOLE } from './photo.constants';
import {
	framed,
	isWhole,
	keptIn,
	leastOf,
	movedBy,
	placeOf,
	pulledIn,
	toCrop,
	toPlaceStyle,
	zoomedAt
} from './photo.utils';

// A landscape photo (4:3) and a portrait one (3:4), in a square box and a box of the photo's own shape.
const WIDE = { width: 1600, height: 1200 };
const TALL = { width: 1200, height: 1600 };
const SQUARE = { width: 300, height: 300 };
const FOUR_THREE = { width: 400, height: 300 };

function near(value: number, places = 6) {
	return Number(value.toFixed(places));
}

describe('placeOf', () => {
	it('fills the box as object-fit cover does when there is no crop', () => {
		expect(placeOf(WIDE, SQUARE)).toEqual({ width: 400, height: 300, left: -50, top: 0 });
		expect(placeOf(TALL, SQUARE)).toEqual({ width: 300, height: 400, left: 0, top: -50 });
	});

	it('zooms in around the crop point, which sits at the centre of the box', () => {
		const place = placeOf(WIDE, FOUR_THREE, { zoom: 2, x: 0.5, y: 0.5 });
		expect(place).toEqual({ width: 800, height: 600, left: -200, top: -150 });
	});

	it('never leaves a gap: a point too near an edge is pulled in', () => {
		const place = placeOf(WIDE, FOUR_THREE, { zoom: 2, x: 0, y: 1 });
		expect(place).toEqual({ width: 800, height: 600, left: 0, top: -300 });
	});
});

describe('toPlaceStyle', () => {
	it('gives the place as percentages of the box, so it holds when the box is drawn at another size', () => {
		const style = toPlaceStyle(placeOf(WIDE, FOUR_THREE, { zoom: 2, x: 0.5, y: 0.5 }), FOUR_THREE);
		expect(style).toBe('width: 200%; height: 200%; left: -50%; top: -50%;');
	});
});

describe('isWhole', () => {
	it('is true with no crop, or a crop of the whole photo', () => {
		expect(isWhole(undefined)).toBe(true);
		expect(isWhole(WHOLE)).toBe(true);
		expect(isWhole({ zoom: 1, x: 0.5, y: 0.5000001 })).toBe(true);
	});

	it('is false once zoomed or moved', () => {
		expect(isWhole({ zoom: 1.2, x: 0.5, y: 0.5 })).toBe(false);
		expect(isWhole({ zoom: 1, x: 0.3, y: 0.5 })).toBe(false);
	});
});

describe('toCrop', () => {
	it('reads a stored crop, kept to the allowed range', () => {
		expect(toCrop({ zoom: 9, x: -1, y: 0.25 })).toEqual({ zoom: MOST_ZOOM, x: 0, y: 0.25 });
	});

	it('rounds to four places, enough for a 5x zoom on a big photo', () => {
		expect(toCrop({ zoom: 2.123456, x: 0.333333333, y: 0.5 })).toEqual({
			zoom: 2.1235,
			x: 0.3333,
			y: 0.5
		});
	});

	it('gives nothing for a whole photo or anything that is not a crop', () => {
		expect(toCrop({ zoom: 1, x: 0.5, y: 0.5 })).toBeUndefined();
		expect(toCrop(null)).toBeUndefined();
		expect(toCrop('2,0.5,0.5')).toBeUndefined();
		expect(toCrop({ zoom: 'big', x: 0.5, y: 0.5 })).toBeUndefined();
	});
});

describe('keptIn', () => {
	it('keeps the zoom between the whole photo and five times', () => {
		expect(keptIn(WIDE, FOUR_THREE, { zoom: 0.5, x: 0.5, y: 0.5 }).zoom).toBe(1);
		expect(keptIn(WIDE, FOUR_THREE, { zoom: 8, x: 0.5, y: 0.5 }).zoom).toBe(MOST_ZOOM);
	});

	it('moves the point in so the photo still covers the box', () => {
		expect(keptIn(WIDE, FOUR_THREE, { zoom: 2, x: 0.1, y: 0.9 })).toEqual({
			zoom: 2,
			x: 0.25,
			y: 0.75
		});
	});
});

describe('movedBy', () => {
	it('moves the photo with the finger: dragging right shows more of its left', () => {
		const crop = movedBy(WIDE, FOUR_THREE, { zoom: 2, x: 0.5, y: 0.5 }, 80, 0);
		expect(near(crop.x)).toBe(0.4);
		expect(crop.y).toBe(0.5);
	});

	it('stops at the edge of the photo', () => {
		expect(movedBy(WIDE, FOUR_THREE, { zoom: 2, x: 0.5, y: 0.5 }, 1000, 0).x).toBe(0.25);
	});
});

describe('zoomedAt', () => {
	it('keeps the point under the fingers where it was', () => {
		const at = { x: 100, y: 75 };
		const before = placeOf(WIDE, FOUR_THREE, WHOLE);
		const crop = zoomedAt(WIDE, FOUR_THREE, WHOLE, 2, at);
		const after = placeOf(WIDE, FOUR_THREE, crop);
		expect(crop.zoom).toBe(2);
		expect(near((at.x - after.left) / after.width)).toBe(near((at.x - before.left) / before.width));
		expect(near((at.y - after.top) / after.height)).toBe(near((at.y - before.top) / before.height));
	});

	it('goes no further than five times', () => {
		expect(
			zoomedAt(WIDE, FOUR_THREE, { zoom: 4, x: 0.5, y: 0.5 }, 3, { x: 200, y: 150 }).zoom
		).toBe(MOST_ZOOM);
	});
});

describe('pulledIn', () => {
	it('moves a corner along the line from the opposite one, keeping the frame its shape', () => {
		expect(pulledIn('tl', FOUR_THREE, { x: 200, y: 150 }, 0.2)).toEqual({
			left: 200,
			top: 150,
			width: 200,
			height: 150
		});
		expect(pulledIn('br', FOUR_THREE, { x: 200, y: 150 }, 0.2)).toEqual({
			left: 0,
			top: 0,
			width: 200,
			height: 150
		});
	});

	it('follows a corner pulled straight across, part of the way', () => {
		const rect = pulledIn('tr', FOUR_THREE, { x: 200, y: 0 }, 0.2);
		expect(near(rect.width / FOUR_THREE.width, 4)).toBe(near(rect.height / FOUR_THREE.height, 4));
		expect(rect.width).toBeLessThan(400);
		expect(rect.left).toBe(0);
		expect(rect.top + rect.height).toBeCloseTo(300, 6);
	});

	it('pulls an edge in from the opposite edge and keeps it centred the other way', () => {
		expect(pulledIn('t', FOUR_THREE, { x: 50, y: 150 }, 0.2)).toEqual({
			left: 100,
			top: 150,
			width: 200,
			height: 150
		});
		expect(pulledIn('l', FOUR_THREE, { x: 200, y: 0 }, 0.2)).toEqual({
			left: 200,
			top: 75,
			width: 200,
			height: 150
		});
	});

	it('stops at the least it may shrink to, and at its full size', () => {
		expect(pulledIn('r', FOUR_THREE, { x: 4, y: 150 }, 0.25).width).toBe(100);
		expect(pulledIn('r', FOUR_THREE, { x: 900, y: 150 }, 0.25).width).toBe(400);
	});
});

describe('leastOf', () => {
	it('lets the frame shrink only as far as five times zoom', () => {
		const box = { width: 1000, height: 750 };
		expect(leastOf(box, WHOLE)).toBe(1 / MOST_ZOOM);
		expect(leastOf(box, { zoom: 2.5, x: 0.5, y: 0.5 })).toBe(0.5);
		expect(leastOf(box, { zoom: MOST_ZOOM, x: 0.5, y: 0.5 })).toBe(1);
	});

	it('never lets a small frame shrink under 64 px', () => {
		expect(leastOf({ width: 200, height: 160 }, WHOLE)).toBe(0.4);
	});
});

describe('framed', () => {
	it('makes what the pulled-in frame shows fill the box', () => {
		const crop = framed(WIDE, FOUR_THREE, WHOLE, { left: 200, top: 150, width: 200, height: 150 });
		expect(crop).toEqual({ zoom: 2, x: 0.75, y: 0.75 });
	});

	it('builds on a crop already there', () => {
		const crop = framed(
			WIDE,
			FOUR_THREE,
			{ zoom: 2, x: 0.5, y: 0.5 },
			{ left: 0, top: 0, width: 200, height: 150 }
		);
		expect(crop).toEqual({ zoom: 4, x: 0.375, y: 0.375 });
	});
});
